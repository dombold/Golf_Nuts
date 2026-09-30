import { prisma } from "@/lib/prisma";
import { isAdmin as userIsAdmin } from "@/lib/permissions";

export interface ScoreAccess {
  canEdit: boolean;
  /** Why editing isn't allowed (for the 403 body) */
  reason?: string;
  /** The viewer organised the event this round belongs to */
  isOrganiser: boolean;
  /** The event's scores are locked by the organiser */
  locked: boolean;
  /** The viewer is an administrator acting on a round that isn't theirs (not a player, not the organiser) */
  isAdmin: boolean;
  /** Whoever normally controls the round: the event organiser, or the casual round's creator */
  ownerId: string | null;
}

/**
 * Who may enter or change a round's scores:
 * - the event organiser — always, for any group, locked or not
 * - an administrator — always, for any round (acts as the organiser)
 * - a player in the round — unless the organiser has locked the event's scores
 * - nobody else
 * Returns null when the round doesn't exist.
 */
export async function scoreAccess(roundId: string, userId: string): Promise<ScoreAccess | null> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      createdById: true,
      players: { where: { userId }, select: { id: true } },
      tournamentRounds: { take: 1, select: { tournament: { select: { createdById: true, scoresLockedAt: true } } } },
    },
  });
  if (!round) return null;

  const tournament = round.tournamentRounds[0]?.tournament;
  const isOrganiser = tournament?.createdById === userId;
  const locked = !!tournament?.scoresLockedAt;
  const isPlayer = round.players.length > 0;
  const ownerId = tournament ? tournament.createdById : round.createdById;
  const base = { isOrganiser, locked, ownerId };

  if (isOrganiser) return { canEdit: true, ...base, isAdmin: false };
  // Only consult the admin flag when it changes the answer
  const admin = (!isPlayer || locked) && (await userIsAdmin(userId));
  if (admin) return { canEdit: true, ...base, isAdmin: true };
  if (!isPlayer) return { canEdit: false, reason: "Forbidden", ...base, isAdmin: false };
  if (locked) return { canEdit: false, reason: "Scores are locked by the organiser", ...base, isAdmin: false };
  return { canEdit: true, ...base, isAdmin: false };
}
