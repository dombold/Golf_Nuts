import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requireAdmin } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin reopens a completed event: unlocked, back to ACTIVE, and every group's round back to
 * ACTIVE so cards can be corrected and finished again. Finishing the last group re-completes the
 * event, and re-recording differentials replaces the old rows, so handicaps never double-count.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { name: true, status: true, rounds: { select: { roundId: true } } },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.status !== "COMPLETE") {
    return Response.json({ error: "Only a completed event can be reopened" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.tournament.update({
      where: { id },
      data: { status: "ACTIVE", completedAt: null, scoresLockedAt: null },
    }),
    prisma.round.updateMany({
      where: { id: { in: tournament.rounds.map((r) => r.roundId) } },
      data: { status: "ACTIVE" },
    }),
  ]);

  await logAdminAction(admin.userId, "tournament.reopen", { type: "tournament", id }, `Reopened ${tournament.name}`);
  return Response.json({ ok: true });
}
