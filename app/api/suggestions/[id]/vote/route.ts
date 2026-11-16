import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({ voted: z.boolean() });

/** Add or remove the member's 👍 (idempotent). Returns the new vote count. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: suggestionId } = await params;
  const exists = await prisma.suggestion.findUnique({ where: { id: suggestionId }, select: { id: true } });
  if (!exists) return Response.json({ error: "Suggestion not found" }, { status: 404 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const userId = session.user.id;
  if (parsed.data.voted) {
    await prisma.suggestionVote.upsert({
      where: { suggestionId_userId: { suggestionId, userId } },
      update: {},
      create: { suggestionId, userId },
    });
  } else {
    await prisma.suggestionVote.deleteMany({ where: { suggestionId, userId } });
  }

  const votes = await prisma.suggestionVote.count({ where: { suggestionId } });
  return Response.json({ voted: parsed.data.voted, votes });
}
