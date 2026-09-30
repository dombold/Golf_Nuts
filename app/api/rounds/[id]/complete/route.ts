import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordRoundDifferential } from "@/lib/recalcHandicap";
import { formatMissing, missingScores } from "@/lib/roundCompletion";
import { isHoleInPlay } from "@/lib/nines";
import type { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/rounds/[id]/complete">
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roundId } = await ctx.params;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      format: true,
      status: true,
      holesCount: true,
      startingHole: true,
      stablefordTeamSize: true,
      tee: { select: { holes: { select: { number: true, par: true, strokeIndex: true } } } },
      players: {
        select: {
          userId: true,
          playingHandicap: true,
          teamNumber: true,
          user: { select: { name: true } },
          scores: { select: { holeNumber: true, strokes: true } },
        },
      },
    },
  });
  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });
  if (!round.players.some((p) => p.userId === session.user.id)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (round.status === "COMPLETE") return Response.json({ success: true, alreadyComplete: true });

  // Every card must be complete before the round can be finished
  const missing = missingScores({
    format: round.format,
    stablefordTeamSize: round.stablefordTeamSize,
    holes: round.tee.holes.filter((h) => isHoleInPlay(h.number, round.holesCount, round.startingHole)),
    players: round.players.map((p) => ({
      name: p.user.name,
      playingHandicap: p.playingHandicap,
      teamNumber: p.teamNumber,
      scores: new Map(p.scores.map((s) => [s.holeNumber, s.strokes])),
    })),
  });
  if (missing.length > 0) {
    return Response.json({ error: { message: `Scores missing: ${formatMissing(missing)}`, missing } }, { status: 409 });
  }

  // Flip to COMPLETE atomically — a second request (another phone, a retry) is a no-op,
  // so handicap history is never written twice.
  const { count } = await prisma.round.updateMany({
    where: { id: roundId, status: { not: "COMPLETE" } },
    data: { status: "COMPLETE" },
  });
  if (count === 0) return Response.json({ success: true, alreadyComplete: true });

  // Tournament rounds: once every group has finished, the tournament is complete
  const tournamentRound = await prisma.tournamentRound.findFirst({
    where: { roundId },
    select: {
      tournament: {
        select: { id: true, status: true, rounds: { select: { round: { select: { status: true } } } } },
      },
    },
  });
  const tournament = tournamentRound?.tournament;
  if (tournament?.status === "ACTIVE" && tournament.rounds.every((tr) => tr.round.status === "COMPLETE")) {
    await prisma.tournament.updateMany({
      where: { id: tournament.id, status: "ACTIVE" },
      data: { status: "COMPLETE", completedAt: new Date() },
    });
  }

  // Only strokeplay rounds count toward handicap under WHS
  if (round.format === "STROKEPLAY") {
    await Promise.all(round.players.map((p) => recordRoundDifferential(roundId, p.userId)));
  }

  return Response.json({ success: true });
}
