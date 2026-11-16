import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUGGESTION_BODY_MAX, SUGGESTION_TITLE_MAX } from "@/lib/suggestions";
import type { NextRequest } from "next/server";
import { z } from "zod";

const Schema = z.object({
  title: z.string().trim().min(3, "Give your suggestion a short title").max(SUGGESTION_TITLE_MAX),
  body: z.string().trim().max(SUGGESTION_BODY_MAX).optional().default(""),
});

/** Any member posts a suggestion; it starts with their own vote. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid suggestion" }, { status: 400 });
  }

  const userId = session.user.id;
  const suggestion = await prisma.suggestion.create({
    data: { ...parsed.data, authorId: userId, votes: { create: { userId } } },
    select: { id: true },
  });
  return Response.json({ suggestion }, { status: 201 });
}
