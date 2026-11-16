import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ambroseTeamHandicap } from "@/lib/formats";
import { isTeamGame } from "@/lib/gameFormats";
import { mergeBestBallScores, strandedPartnerMove } from "@/lib/teams";
import type { NextRequest } from "next/server";
import { z } from "zod";

const Schema = z.object({
  userId: z.string().min(1),
  // Team games: move a partner left on their own into another team (2-ball → one 3-ball team)
  mergeTeams: z.boolean().optional().default(true),
});

/**
 * Organiser withdraws a player from one group of a live event (a late withdrawal after the
 * start). Their round entry and scores are removed and their invitation is marked declined.
 * In a team game, a partner left on their own joins another team in the group, and the
 * merged team's holes already entered are set to its best ball. Other groups are untouched.
 */
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roundId } = await ctx.params;
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      status: true,
      format: true,
      stablefordTeamSize: true,
      players: {
        select: {
          id: true,
          userId: true,
          teamNumber: true,
          playingHandicap: true,
          scores: { select: { holeNumber: true, strokes: true } },
        },
      },
      tournamentRounds: {
        take: 1,
        select: { roundNumber: true, tournament: { select: { id: true, createdById: true, status: true } } },
      },
    },
  });
  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });
  const tr = round.tournamentRounds[0];
  if (!tr) return Response.json({ error: "Only event groups can have a player withdrawn" }, { status: 409 });
  const { tournament } = tr;
  if (!(await canOrganise(tournament.createdById, session.user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tournament.status !== "ACTIVE" || round.status !== "ACTIVE") {
    return Response.json({ error: "Players can only be withdrawn while the group is still playing" }, { status: 409 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { userId, mergeTeams } = parsed.data;

  const withdrawn = round.players.find((p) => p.userId === userId);
  if (!withdrawn) return Response.json({ error: "That player isn't in this group" }, { status: 404 });
  const remaining = round.players.filter((p) => p.userId !== userId);
  if (remaining.length === 0) {
    return Response.json({ error: "A group needs at least one player — this is the last one" }, { status: 409 });
  }

  const teamGame = isTeamGame(round.format, round.stablefordTeamSize);
  const move = teamGame && mergeTeams ? strandedPartnerMove(round.players, userId) : null;
  const teamOf = (p: { userId: string; teamNumber: number | null }) =>
    move && p.userId === move.userId ? move.toTeam : (p.teamNumber ?? 0);
  const mergedTeam = move ? remaining.filter((p) => teamOf(p) === move.toTeam) : [];
  const bestBall = mergeBestBallScores(mergedTeam.map((p) => p.scores));

  await prisma.$transaction(async (tx) => {
    // Scores cascade with the round player
    await tx.roundPlayer.delete({ where: { id: withdrawn.id } });
    await tx.tournamentGroupMember.deleteMany({
      where: { userId, group: { tournamentId: tournament.id, groupNumber: tr.roundNumber } },
    });
    await tx.tournamentInvitation.updateMany({
      where: { tournamentId: tournament.id, userId },
      data: { status: "DECLINED" },
    });

    if (move) {
      const mover = remaining.find((p) => p.userId === move.userId)!;
      await tx.roundPlayer.update({ where: { id: mover.id }, data: { teamNumber: move.toTeam } });
      await tx.tournamentGroupMember.updateMany({
        where: { userId: move.userId, group: { tournamentId: tournament.id, groupNumber: tr.roundNumber } },
        data: { teamNumber: move.toTeam },
      });
      // Team scores are stored against every member — make them agree on the merged team's best ball
      const enteredAt = new Date();
      for (const p of mergedTeam) {
        for (const [holeNumber, strokes] of bestBall) {
          await tx.score.upsert({
            where: { roundPlayerId_holeNumber: { roundPlayerId: p.id, holeNumber } },
            update: { strokes, penalties: 0, enteredAt },
            create: { roundPlayerId: p.id, holeNumber, strokes, penalties: 0, enteredAt },
          });
        }
      }
    }
  });

  await logTournamentAction(session.user.id, "tournament.withdraw", tournament, "Withdrew a player");

  return Response.json({
    merged: move
      ? { team: move.toTeam, players: mergedTeam.length, teamHandicap: ambroseTeamHandicap(mergedTeam.map((p) => p.playingHandicap)) }
      : null,
  });
}
