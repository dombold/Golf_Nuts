import { prisma } from "@/lib/prisma";

export interface ScoreAccess {
  canEdit: boolean;
  /** Why editing isn't allowed (for the 403 body) */
  reason?: string;
  /** The viewer organised the event this round belongs to */
  isOrganiser: boolean;
  /** The event's scores are locked by the organiser */
  locked: boolean;
}

/**
 * Who may enter or change a round's scores:
 * - the event organiser — always, for any group, locked or not
 * - a player in the round — unless the organiser has locked the event's scores
 * - nobody else
 * Returns null when the round doesn't exist.
 */
export async function scoreAccess(roundId: string, userId: string): Promise<ScoreAccess | null> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      players: { where: { userId }, select: { id: true } },
      tournamentRounds: { take: 1, select: { tournament: { select: { createdById: true, scoresLockedAt: true } } } },
    },
  });
  if (!round) return null;

  const tournament = round.tournamentRounds[0]?.tournament;
  const isOrganiser = tournament?.createdById === userId;
  const locked = !!tournament?.scoresLockedAt;
  const isPlayer = round.players.length > 0;

  if (isOrganiser) return { canEdit: true, isOrganiser, locked };
  if (!isPlayer) return { canEdit: false, reason: "Forbidden", isOrganiser, locked };
  if (locked) return { canEdit: false, reason: "Scores are locked by the organiser", isOrganiser, locked };
  return { canEdit: true, isOrganiser, locked };
}
