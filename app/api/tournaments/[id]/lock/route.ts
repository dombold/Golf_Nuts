import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({ locked: z.boolean() });

/** Organiser locks (or unlocks) a completed event's scores. Locked: only the organiser can edit. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { createdById: true, status: true } });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.createdById !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "COMPLETE") {
    return Response.json({ error: "Scores can only be locked once the event is complete" }, { status: 409 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const updated = await prisma.tournament.update({
    where: { id },
    data: { scoresLockedAt: parsed.data.locked ? new Date() : null },
    select: { scoresLockedAt: true },
  });
  return Response.json({ scoresLockedAt: updated.scoresLockedAt });
}
