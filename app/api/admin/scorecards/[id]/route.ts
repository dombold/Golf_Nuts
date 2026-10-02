import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requireAdmin } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

/** Admin marks a scorecard submission as reviewed (the course data is updated separately). */
export async function PATCH(_req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const { id } = await params;
  const submission = await prisma.scorecardSubmission.findUnique({
    where: { id },
    select: { status: true, course: { select: { name: true } }, tee: { select: { name: true } } },
  });
  if (!submission) return Response.json({ error: "Scorecard not found" }, { status: 404 });
  if (submission.status === "REVIEWED") return Response.json({ error: "Already reviewed" }, { status: 409 });

  await prisma.scorecardSubmission.update({
    where: { id },
    data: { status: "REVIEWED", reviewedAt: new Date(), reviewedById: admin.userId },
  });

  const label = submission.tee ? `${submission.course.name} (${submission.tee.name})` : submission.course.name;
  await logAdminAction(admin.userId, "scorecard.review", { type: "scorecard", id }, `Reviewed scorecard for ${label}`);
  return Response.json({ ok: true });
}
