import { auth } from "@/lib/auth";
import { isAdmin, logAdminAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SUGGESTION_BODY_MAX, SUGGESTION_TITLE_MAX } from "@/lib/suggestions";
import type { NextRequest } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  title: z.string().trim().min(3, "Give your suggestion a short title").max(SUGGESTION_TITLE_MAX).optional(),
  body: z.string().trim().max(SUGGESTION_BODY_MAX).optional(),
  // Administrators only
  status: z.enum(["OPEN", "PLANNED", "DONE", "NOT_PLANNED"]).optional(),
  doneVersion: z.string().trim().regex(/^\d+\.\d+\.\d+$/, "Version looks like 1.7.0").nullable().optional(),
});

async function load(id: string) {
  return prisma.suggestion.findUnique({ where: { id }, select: { authorId: true, title: true } });
}

/** The author edits their wording; an administrator can also set the status. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const suggestion = await load(id);
  if (!suggestion) return Response.json({ error: "Suggestion not found" }, { status: 404 });
  const admin = await isAdmin(session.user.id);
  const author = suggestion.authorId === session.user.id;
  if (!author && !admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid change" }, { status: 400 });
  }
  const { title, body, status, doneVersion } = parsed.data;
  if ((status !== undefined || doneVersion !== undefined) && !admin) {
    return Response.json({ error: "Only an administrator can change the status" }, { status: 403 });
  }

  const updated = await prisma.suggestion.update({
    where: { id },
    data: {
      title,
      body,
      status,
      // A version only makes sense on a Done suggestion
      doneVersion: status !== undefined && status !== "DONE" ? null : doneVersion,
    },
    select: { id: true, title: true, body: true, status: true, doneVersion: true },
  });
  // Logged only when an administrator changes someone else's suggestion
  const what = status !== undefined ? `Set suggestion to ${status.replace("_", " ").toLowerCase()}` : "Edited a suggestion";
  await logAdminAction(session.user.id, "suggestion.update", { type: "suggestion", id, ownerId: suggestion.authorId }, `${what}: ${updated.title}`);
  return Response.json({ suggestion: updated });
}

/** The author or an administrator deletes a suggestion (its votes and comments go with it). */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const suggestion = await load(id);
  if (!suggestion) return Response.json({ error: "Suggestion not found" }, { status: 404 });
  if (suggestion.authorId !== session.user.id && !(await isAdmin(session.user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.suggestion.delete({ where: { id } });
  await logAdminAction(session.user.id, "suggestion.delete", { type: "suggestion", id, ownerId: suggestion.authorId }, `Deleted a suggestion: ${suggestion.title}`);
  return Response.json({ deleted: true });
}
