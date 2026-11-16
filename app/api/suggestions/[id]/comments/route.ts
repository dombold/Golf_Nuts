import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUGGESTION_COMMENT_MAX } from "@/lib/suggestions";
import type { NextRequest } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({
  body: z.string().trim().min(1, "Write a comment first").max(SUGGESTION_COMMENT_MAX),
});

/** Any member comments on a suggestion. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: suggestionId } = await params;
  const exists = await prisma.suggestion.findUnique({ where: { id: suggestionId }, select: { id: true } });
  if (!exists) return Response.json({ error: "Suggestion not found" }, { status: 404 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid comment" }, { status: 400 });
  }

  const comment = await prisma.suggestionComment.create({
    data: { suggestionId, userId: session.user.id, body: parsed.data.body },
    select: { id: true },
  });
  return Response.json({ comment }, { status: 201 });
}
