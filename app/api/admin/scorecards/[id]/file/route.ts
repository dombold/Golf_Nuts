import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { scorecardPath } from "@/lib/scorecards";

type Ctx = { params: Promise<{ id: string }> };

/** Admin-only download of an uploaded scorecard (files live outside public/). */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const { id } = await params;
  const submission = await prisma.scorecardSubmission.findUnique({
    where: { id },
    select: { fileName: true, mimeType: true },
  });
  if (!submission?.fileName) return Response.json({ error: "Scorecard not found" }, { status: 404 });

  const file = await readFile(scorecardPath(submission.fileName)).catch(() => null);
  if (!file) return Response.json({ error: "The scorecard file is missing" }, { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": submission.mimeType,
      "Content-Disposition": `inline; filename="${submission.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
