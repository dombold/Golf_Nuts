import { auth } from "@/lib/auth";
import { isAdmin, logAdminAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

/** The comment's author or an administrator deletes it. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: suggestionId, commentId } = await params;
  // Scoped to the suggestion in the URL
  const comment = await prisma.suggestionComment.findFirst({
    where: { id: commentId, suggestionId },
    select: { userId: true, suggestion: { select: { title: true } } },
  });
  if (!comment) return Response.json({ error: "Comment not found" }, { status: 404 });
  if (comment.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.suggestionComment.delete({ where: { id: commentId } });
  await logAdminAction(session.user.id, "suggestion.comment.delete", { type: "suggestion", id: suggestionId, ownerId: comment.userId }, `Deleted a comment on: ${comment.suggestion.title}`);
  return Response.json({ deleted: true });
}
