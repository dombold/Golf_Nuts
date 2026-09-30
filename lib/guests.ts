import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { recordRoundDifferential, updateHandicapIndex } from "@/lib/recalcHandicap";
import { type GuestInput, guestNameProblem, normaliseGuestName } from "@/lib/guestNames";

export { GuestInputSchema } from "@/lib/guestNames";

/**
 * Guest (temporary) players: unregistered golfers an organiser adds to an event or casual round.
 * They are `User` rows with `isGuest = true`, so groups, teams, scoring and standings treat them
 * like anyone else — but they can never sign in, never appear in member lists, and never get a
 * handicap history. Their scores are entered by a playing partner.
 */

/** Unclaimed guests are anonymised ("Guest N") this long after they were added. */
const ANONYMISE_AFTER_MS = 365 * 24 * 60 * 60 * 1000;

export class GuestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Full name check: the pure rules plus "not the same as a registered member's name or username". */
export async function validateGuestName(
  db: Prisma.TransactionClient,
  name: string,
  otherGuestNames: string[]
): Promise<string | null> {
  const problem = guestNameProblem(name, otherGuestNames);
  if (problem) return problem;
  const n = normaliseGuestName(name);
  const member = await db.user.findFirst({
    where: {
      isGuest: false,
      OR: [{ name: { equals: n, mode: "insensitive" } }, { username: { equals: n, mode: "insensitive" } }],
    },
    select: { id: true },
  });
  return member ? `A registered member is already called ${n} — add a surname initial or pick the member instead` : null;
}

/** Create a guest user. Call validateGuestName first. */
export async function createGuest(
  db: Prisma.TransactionClient,
  { name, handicapIndex, createdById }: GuestInput & { createdById: string }
) {
  const n = normaliseGuestName(name);
  const [firstName, ...rest] = n.split(" ");
  const key = crypto.randomBytes(8).toString("hex");
  return db.user.create({
    data: {
      isGuest: true,
      guestCreatedById: createdById,
      username: `guest_${key}`,
      email: `guest_${key}@guest.invalid`,
      // Not a valid bcrypt hash, so no password can ever match (sign-in also rejects guests outright)
      passwordHash: "!",
      firstName,
      lastName: rest.join(" "),
      name: n,
      handicapIndex,
    },
    select: { id: true, name: true, handicapIndex: true },
  });
}

/** Everything needed to authorise an action on a guest and to know where they've played. */
async function loadGuest(guestId: string) {
  const guest = await prisma.user.findUnique({
    where: { id: guestId },
    select: {
      id: true,
      name: true,
      isGuest: true,
      guestCreatedById: true,
      rounds: {
        select: {
          id: true,
          roundId: true,
          _count: { select: { scores: true } },
          round: { select: { createdById: true, status: true, format: true, date: true } },
        },
      },
      tournamentInvitations: {
        select: { tournamentId: true, tournament: { select: { createdById: true, name: true, status: true } } },
      },
    },
  });
  if (!guest || !guest.isGuest) throw new GuestError(404, "Guest not found");
  return guest;
}

/** The guest's creator, the organiser of an event they're in, or the creator of a round they played. */
function canManage(guest: Awaited<ReturnType<typeof loadGuest>>, actorId: string): boolean {
  return (
    guest.guestCreatedById === actorId ||
    guest.tournamentInvitations.some((i) => i.tournament.createdById === actorId) ||
    guest.rounds.some((rp) => rp.round.createdById === actorId)
  );
}

/**
 * Hand a guest's rounds, event places and prize-hole wins to a registered member, then delete the guest.
 * Completed Strokeplay rounds are added to the member's handicap history (at the date they were played)
 * and their index recalculated. The playing handicap on each round is kept — it's what they played off.
 */
export async function reassignGuest(guestId: string, targetUserId: string, actorId: string) {
  const guest = await loadGuest(guestId);
  if (!canManage(guest, actorId)) throw new GuestError(403, "Only the organiser can reassign this guest");

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isGuest: true, name: true } });
  if (!target || target.isGuest) throw new GuestError(404, "Member not found");

  const roundIds = guest.rounds.map((rp) => rp.roundId);
  const tournamentIds = guest.tournamentInvitations.map((i) => i.tournamentId);
  const [roundClash, eventClash] = await Promise.all([
    prisma.roundPlayer.findFirst({
      where: { userId: targetUserId, roundId: { in: roundIds } },
      select: { round: { select: { date: true, course: { select: { name: true } } } } },
    }),
    prisma.tournamentInvitation.findFirst({
      where: { userId: targetUserId, tournamentId: { in: tournamentIds } },
      select: { tournament: { select: { name: true } } },
    }),
  ]);
  if (eventClash) throw new GuestError(409, `${target.name} is already in ${eventClash.tournament.name}`);
  if (roundClash) {
    throw new GuestError(409, `${target.name} already played in the ${roundClash.round.course.name} round on ${roundClash.round.date.toLocaleDateString("en-AU")}`);
  }

  await prisma.$transaction([
    prisma.roundPlayer.updateMany({ where: { userId: guestId }, data: { userId: targetUserId } }),
    prisma.tournamentInvitation.updateMany({ where: { userId: guestId }, data: { userId: targetUserId } }),
    prisma.tournamentGroupMember.updateMany({ where: { userId: guestId }, data: { userId: targetUserId } }),
    prisma.tournamentPrizeHole.updateMany({ where: { winnerId: guestId }, data: { winnerId: targetUserId } }),
    prisma.user.delete({ where: { id: guestId } }),
  ]);

  // Handicap: oldest first, each history row dated when the round was played so it sits in order
  const counted = guest.rounds
    .filter((rp) => rp.round.status === "COMPLETE" && rp.round.format === "STROKEPLAY")
    .sort((a, b) => a.round.date.getTime() - b.round.date.getTime());
  for (const rp of counted) {
    await recordRoundDifferential(rp.roundId, targetUserId, { recalc: false });
    await prisma.handicapHistory.updateMany({
      where: { roundId: rp.roundId, userId: targetUserId },
      data: { createdAt: rp.round.date },
    });
  }
  if (counted.length > 0) await updateHandicapIndex(targetUserId);

  return { rounds: roundIds.length, events: tournamentIds.length, handicapRounds: counted.length };
}

/**
 * Remove a guest who hasn't scored (e.g. a no-show). A guest with scores is part of the results,
 * so they can only be anonymised — deleting them would change past leaderboards.
 */
export async function deleteGuest(guestId: string, actorId: string) {
  const guest = await loadGuest(guestId);
  if (!canManage(guest, actorId)) throw new GuestError(403, "Only the organiser can remove this guest");
  if (guest.rounds.some((rp) => rp._count.scores > 0)) {
    throw new GuestError(409, `${guest.name} has scores recorded — anonymise them instead`);
  }

  const groups = await prisma.tournamentGroupMember.findMany({ where: { userId: guestId }, select: { groupId: true } });
  await prisma.$transaction(async (tx) => {
    await tx.roundPlayer.deleteMany({ where: { userId: guestId } });
    await tx.tournamentGroupMember.deleteMany({ where: { userId: guestId } });
    await tx.tournamentInvitation.deleteMany({ where: { userId: guestId } });
    // Groups the guest leaves empty go too (same as un-accepting an invitee)
    await tx.tournamentGroup.deleteMany({
      where: { id: { in: groups.map((g) => g.groupId) }, members: { none: {} } },
    });
    await tx.user.delete({ where: { id: guestId } });
  });
}

/** Next free "Guest N" number. */
async function nextGuestNumber(db: Prisma.TransactionClient): Promise<number> {
  const anonymised = await db.user.findMany({ where: { isGuest: true, firstName: "Guest" }, select: { lastName: true } });
  return anonymised.reduce((max, u) => Math.max(max, Number(u.lastName) || 0), 0) + 1;
}

/** Replace a guest's name with "Guest N". Results stay intact; the personal name is gone. */
async function anonymise(db: Prisma.TransactionClient, guestId: string) {
  const n = await nextGuestNumber(db);
  await db.user.update({
    where: { id: guestId },
    data: { name: `Guest ${n}`, firstName: "Guest", lastName: String(n) },
  });
}

export async function anonymiseGuest(guestId: string, actorId: string) {
  const guest = await loadGuest(guestId);
  if (!canManage(guest, actorId)) throw new GuestError(403, "Only the organiser can anonymise this guest");
  await prisma.$transaction((tx) => anonymise(tx, guestId));
}

/**
 * Housekeeping, called from write paths (like pruneStaleTournaments):
 * - delete guests left with no rounds and no events (e.g. their event was pruned before it started)
 * - anonymise guests nobody has claimed within a year
 * Guest names are the only personal data held for them; anonymising keeps past results intact.
 */
export async function pruneGuests() {
  await prisma.user.deleteMany({
    where: { isGuest: true, rounds: { none: {} }, tournamentInvitations: { none: {} }, tournamentGroupMembers: { none: {} } },
  });
  const stale = await prisma.user.findMany({
    where: { isGuest: true, NOT: { firstName: "Guest" }, createdAt: { lt: new Date(Date.now() - ANONYMISE_AFTER_MS) } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (stale.length === 0) return;
  await prisma.$transaction(async (tx) => {
    for (const g of stale) await anonymise(tx, g.id);
  });
}

/** Map a thrown GuestError to a JSON response; rethrow anything else. */
export function guestErrorResponse(err: unknown): Response {
  if (err instanceof GuestError) return Response.json({ error: err.message }, { status: err.status });
  throw err;
}
