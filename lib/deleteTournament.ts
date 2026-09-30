import { prisma } from "@/lib/prisma";
import { updateHandicapIndex } from "@/lib/recalcHandicap";
import { pruneGuests } from "@/lib/guests";

/**
 * Delete an event together with every group's round. Rounds cascade to their players, scores,
 * handicap history, comments and likes. Everyone who had handicap history from those rounds gets
 * their index recalculated afterwards — including rounds of a reopened event, which are ACTIVE
 * again but still hold the history written when they were first completed.
 */
export async function deleteTournamentWithRounds(tournamentId: string): Promise<void> {
  const links = await prisma.tournamentRound.findMany({ where: { tournamentId }, select: { roundId: true } });
  const roundIds = links.map((l) => l.roundId);
  const history = await prisma.handicapHistory.findMany({
    where: { roundId: { in: roundIds } },
    select: { userId: true },
    distinct: ["userId"],
  });

  await prisma.$transaction([
    // The event first: its tournament_rounds links don't cascade from a round, so they'd block the round delete
    prisma.tournament.delete({ where: { id: tournamentId } }),
    prisma.round.deleteMany({ where: { id: { in: roundIds } } }),
  ]);

  for (const { userId } of history) await updateHandicapIndex(userId);

  // Guests who only played in this event now have nothing left
  if (roundIds.length > 0) await pruneGuests();
}

interface WarningRound {
  status: string;
  format: string;
  players: { user: { name: string; isGuest: boolean } }[];
}

/** Confirm-step text: what deleting an event with these group rounds also removes. Empty when it has none. */
export function eventDeletionWarning(rounds: WarningRound[]): string {
  if (rounds.length === 0) return "";
  const inProgress = rounds.filter((r) => r.status !== "COMPLETE").length;
  const parts = [
    `Deletes ${rounds.length} group round${rounds.length === 1 ? "" : "s"}${inProgress === rounds.length ? " in progress" : ""} and all their scores.`,
  ];
  const handicapNames = [
    ...new Set(
      rounds
        .filter((r) => r.status === "COMPLETE" && r.format === "STROKEPLAY")
        .flatMap((r) => r.players.filter((p) => !p.user.isGuest).map((p) => p.user.name))
    ),
  ].sort();
  if (handicapNames.length > 0) parts.push(`Handicaps will be recalculated for ${handicapNames.join(", ")}.`);
  return parts.join(" ");
}
