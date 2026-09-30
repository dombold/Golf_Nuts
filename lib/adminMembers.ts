import { prisma } from "@/lib/prisma";

export interface DeletionImpact {
  members: { id: string; username: string; name: string }[];
  /** Events organised by the members — deleted along with their rounds */
  events: { id: string; name: string; otherInvitees: string[] }[];
  /** Rounds only these members (and guests) played in — deleted */
  rounds: number;
  /** Rounds that also include other registered members — these block the deletion */
  blockingRounds: { id: string; label: string; otherPlayers: string[] }[];
  /** Why the deletion can't go ahead (empty = it can) */
  problems: string[];
}

/**
 * What deleting these members would remove. Nothing is deleted that another registered
 * member played in: if a round includes anyone outside the set, the deletion is blocked,
 * so no one else's scores, results or handicap change.
 */
export async function memberDeletionImpact(userIds: string[], actorId: string): Promise<DeletionImpact> {
  const ids = [...new Set(userIds)];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, name: true, isGuest: true, isAdmin: true },
    orderBy: { name: "asc" },
  });

  const problems: string[] = [];
  if (users.length !== ids.length) problems.push("Some members no longer exist");
  if (ids.includes(actorId)) problems.push("You can't delete your own account");
  for (const u of users) {
    if (u.isGuest) problems.push(`${u.name} is a guest — manage guests from their event or round`);
    if (u.isAdmin && u.id !== actorId) problems.push(`${u.name} is an administrator — remove their admin access first`);
  }

  const set = new Set(ids);
  const organised = await prisma.tournament.findMany({
    where: { createdById: { in: ids } },
    select: {
      id: true,
      name: true,
      invitations: { select: { userId: true, user: { select: { name: true, isGuest: true } } } },
      rounds: { select: { roundId: true } },
    },
  });
  const eventRoundIds = organised.flatMap((t) => t.rounds.map((r) => r.roundId));

  const rounds = await prisma.round.findMany({
    where: { OR: [{ players: { some: { userId: { in: ids } } } }, { id: { in: eventRoundIds } }] },
    select: {
      id: true,
      date: true,
      course: { select: { name: true } },
      players: { select: { userId: true, user: { select: { name: true, isGuest: true } } } },
    },
  });

  const blockingRounds = rounds.flatMap((r) => {
    const others = r.players.filter((p) => !p.user.isGuest && !set.has(p.userId)).map((p) => p.user.name);
    return others.length > 0
      ? [{ id: r.id, label: `${r.course.name}, ${r.date.toISOString().slice(0, 10)}`, otherPlayers: others }]
      : [];
  });
  if (blockingRounds.length > 0) {
    problems.push(
      `${blockingRounds.length} round${blockingRounds.length === 1 ? "" : "s"} also include other members — deleting would change their results`
    );
  }

  return {
    members: users.map(({ id, username, name }) => ({ id, username, name })),
    events: organised.map((t) => ({
      id: t.id,
      name: t.name,
      otherInvitees: t.invitations.filter((i) => !i.user.isGuest && !set.has(i.userId)).map((i) => i.user.name),
    })),
    rounds: rounds.length - blockingRounds.length,
    blockingRounds,
    problems,
  };
}

/**
 * Delete members together with the events they organised and the rounds only they played.
 * Call `memberDeletionImpact` first; this re-checks it and throws if anything blocks.
 */
export async function deleteMembers(userIds: string[], actorId: string): Promise<DeletionImpact> {
  const impact = await memberDeletionImpact(userIds, actorId);
  if (impact.problems.length > 0) throw new Error(impact.problems.join("; "));

  const ids = impact.members.map((m) => m.id);
  const eventIds = impact.events.map((e) => e.id);

  await prisma.$transaction(async (tx) => {
    const eventRounds = await tx.tournamentRound.findMany({ where: { tournamentId: { in: eventIds } }, select: { roundId: true } });
    const playedRounds = await tx.roundPlayer.findMany({ where: { userId: { in: ids } }, select: { roundId: true } });
    const roundIds = [...new Set([...eventRounds, ...playedRounds].map((r) => r.roundId))];

    // Guests who only played alongside these members would be left with nothing — pruneGuests() tidies them later
    await tx.tournament.deleteMany({ where: { id: { in: eventIds } } });
    // A group only these members played in someone else's event (the link doesn't cascade)
    await tx.tournamentRound.deleteMany({ where: { roundId: { in: roundIds } } });
    // Rounds cascade to their players, scores, handicap history, comments and likes
    await tx.round.deleteMany({ where: { id: { in: roundIds } } });

    // The members' remaining rows in other people's events and rounds
    await tx.tournamentGroupMember.deleteMany({ where: { userId: { in: ids } } });
    await tx.tournamentInvitation.deleteMany({ where: { userId: { in: ids } } });
    await tx.handicapHistory.deleteMany({ where: { userId: { in: ids } } });
    await tx.comment.deleteMany({ where: { userId: { in: ids } } });
    await tx.like.deleteMany({ where: { userId: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
  });

  return impact;
}
