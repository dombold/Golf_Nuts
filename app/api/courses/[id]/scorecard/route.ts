import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendScorecardSubmittedEmail } from "@/lib/email";
import {
  SCORECARD_DIR,
  SCORECARD_MAX_BYTES,
  SCORECARD_PENDING_LIMIT,
  SCORECARD_TYPES,
  matchesFileSignature,
  scorecardFileName,
  scorecardPath,
} from "@/lib/scorecards";
import { mkdir, writeFile } from "fs/promises";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const FieldsSchema = z.object({
  teeId: z.string().min(1).max(50).optional(),
  note: z.string().trim().max(500).optional(),
});

/** A member sends the administrator a copy of a course's scorecard (photo or PDF). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id: courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, name: true } });
  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Expected a file upload" }, { status: 400 });
  const file = form.get("file");
  const fields = FieldsSchema.safeParse({
    teeId: form.get("teeId") || undefined,
    note: form.get("note") || undefined,
  });
  if (!fields.success) return Response.json({ error: "Invalid tee or note" }, { status: 400 });

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose a photo or PDF of the scorecard" }, { status: 400 });
  }
  if (!SCORECARD_TYPES[file.type]) {
    return Response.json({ error: "Only JPEG, PNG, WebP, HEIC photos or PDF files are allowed" }, { status: 400 });
  }
  if (file.size > SCORECARD_MAX_BYTES) {
    return Response.json({ error: "The file must be under 10 MB" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesFileSignature(file.type, buffer.subarray(0, 16))) {
    return Response.json({ error: "That file doesn't look like a photo or PDF" }, { status: 400 });
  }

  // The tee, when given, must belong to this course
  const tee = fields.data.teeId
    ? await prisma.tee.findFirst({ where: { id: fields.data.teeId, courseId }, select: { id: true, name: true } })
    : null;
  if (fields.data.teeId && !tee) return Response.json({ error: "Tee not found for this course" }, { status: 400 });

  const pending = await prisma.scorecardSubmission.count({ where: { userId, status: "PENDING" } });
  if (pending >= SCORECARD_PENDING_LIMIT) {
    return Response.json(
      { error: "You have several scorecards waiting for review — please wait for the administrator to catch up" },
      { status: 429 }
    );
  }

  const note = fields.data.note || null;
  // Create the row first so the file is named after its server-generated id
  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.scorecardSubmission.create({
      data: { courseId, teeId: tee?.id ?? null, userId, fileName: "", mimeType: file.type, sizeBytes: file.size, note },
      select: { id: true },
    });
    const fileName = scorecardFileName(created.id, file.type);
    await mkdir(SCORECARD_DIR, { recursive: true });
    await writeFile(scorecardPath(fileName), buffer);
    return tx.scorecardSubmission.update({ where: { id: created.id }, data: { fileName }, select: { id: true } });
  });

  // Let the administrators know once the response is sent — slow or failed mail never blocks or loses the upload
  after(async () => {
    const [admins, sender] = await Promise.all([
      prisma.user.findMany({ where: { isAdmin: true, isGuest: false }, select: { email: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);
    await Promise.all(
      admins.map((a) =>
        sendScorecardSubmittedEmail(a.email, {
          courseName: course.name,
          teeName: tee?.name ?? null,
          submittedBy: sender?.name ?? "A member",
          note,
        }).catch((err) => console.error("Scorecard notification email failed", err))
      )
    );
  });

  return Response.json({ id: submission.id }, { status: 201 });
}
