import { prisma } from "@/lib/prisma";
import { calcHandicapIndex, scoreDifferential } from "@/lib/handicap";
import { isHoleInPlay } from "@/lib/nines";
import { isIncompleteTee } from "@/lib/teeDataIssues";

/**
 * Recalculates a user's handicap index from their full HandicapHistory,
 * excluding any rounds the user has opted out of and rounds on tees with incomplete
 * scorecard data (Tee.dataIssues).
 *
 * Every history row holds an 18-hole Score Differential — 9-hole rounds are converted
 * when recorded, using the WHS expected-score method — so rows are used as-is.
 *
 * `overrides` (roundId → differential, or null to drop the row) lets a dry run see the
 * index a rebuild would produce without writing anything.
 */
export async function recalcHandicap(
  userId: string,
  overrides?: Map<string, number | null>
): Promise<number | null> {
  const [allHistory, excludedPlayers] = await Promise.all([
    prisma.handicapHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { differential: true, roundId: true },
    }),
    prisma.roundPlayer.findMany({
      where: { userId, excludeFromHandicap: true },
      select: { roundId: true },
    }),
  ]);

  // Only STROKEPLAY rounds on fully-rated tees count — look up each roundId
  const roundIds = allHistory.map((h) => h.roundId).filter((id): id is string => id !== null);
  const strokeplayRounds = await prisma.round.findMany({
    where: { id: { in: roundIds }, format: "STROKEPLAY", tee: { dataIssues: { isEmpty: true } } },
    select: { id: true },
  });
  const strokeplayIds = new Set(strokeplayRounds.map((r) => r.id));

  const excludedRoundIds = new Set(excludedPlayers.map((p) => p.roundId));

  // Chronological order is kept so calcHandicapIndex's slice(-20) takes the most recent rounds
  const differentials = allHistory.flatMap((h) => {
    if (h.roundId === null || !strokeplayIds.has(h.roundId) || excludedRoundIds.has(h.roundId)) return [];
    const differential = overrides?.has(h.roundId) ? overrides.get(h.roundId)! : h.differential;
    return differential === null ? [] : [differential];
  });

  return calcHandicapIndex(differentials);
}

/** Recalculate a user's index and save it. Leaves the stored index alone when there's too little history. */
export async function updateHandicapIndex(userId: string): Promise<number | null> {
  const newIndex = await recalcHandicap(userId);
  if (newIndex !== null) {
    await prisma.user.update({ where: { id: userId }, data: { handicapIndex: newIndex } });
  }
  return newIndex;
}

export interface RoundDifferential {
  /** Handicap Index at the time of play (kept from the first time the round was recorded) */
  index: number;
  /** When the round was first recorded, if it already had a history row */
  recordedAt: Date | null;
  isNineHole: boolean;
  /** null when the round doesn't produce a differential (too few holes played, or the tee's
   *  scorecard data is incomplete) — recording it then removes any existing history row */
  result: { differential: number; ags: number } | null;
}

/**
 * Work out one player's differential for a completed strokeplay round, without writing anything.
 * Returns null when the round doesn't count toward handicap at all (not complete / not strokeplay).
 */
export async function computeRoundDifferential(roundId: string, userId: string): Promise<RoundDifferential | null> {
  const [round, existing] = await Promise.all([
    prisma.round.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        format: true,
        holesCount: true,
        startingHole: true,
        tee: {
          select: {
            rating: true,
            slope: true,
            dataIssues: true,
            holes: { select: { number: true, par: true, strokeIndex: true } },
          },
        },
        players: {
          where: { userId },
          select: { scores: { select: { holeNumber: true, strokes: true } }, user: { select: { handicapIndex: true, isGuest: true } } },
        },
      },
    }),
    prisma.handicapHistory.findFirst({
      where: { roundId, userId },
      orderBy: { createdAt: "asc" },
      select: { index: true, createdAt: true },
    }),
  ]);
  const rp = round?.players[0];
  if (!round || !rp || round.status !== "COMPLETE" || round.format !== "STROKEPLAY") return null;
  // Guests have no handicap record — their index is whatever the organiser entered
  if (rp.user.isGuest) return null;

  const strokesByHole = new Map(rp.scores.map((s) => [s.holeNumber, s.strokes]));
  const holes = round.tee.holes
    .filter((h) => isHoleInPlay(h.number, round.holesCount, round.startingHole))
    .map((h) => ({ ...h, strokes: strokesByHole.get(h.number) ?? null }));

  const index = existing?.index ?? rp.user.handicapIndex;
  const isNineHole = round.holesCount === 9;
  // Placeholder ratings / estimated stroke indexes: never counts towards a handicap
  if (isIncompleteTee(round.tee)) return { index, recordedAt: existing?.createdAt ?? null, isNineHole, result: null };

  const result = scoreDifferential({
    holesCount: round.holesCount as 9 | 18,
    courseRating: round.tee.rating,
    slopeRating: round.tee.slope,
    handicapIndex: index,
    holes,
  });
  return { index, recordedAt: existing?.createdAt ?? null, isNineHole, result };
}

/**
 * (Re)write the handicap differential for one player's completed strokeplay round, then
 * recalculate their index. Idempotent: any existing history row for the round is replaced,
 * so completing twice or editing scores afterwards never double-counts.
 * Pass `recalc: false` to skip the index recalculation (e.g. when rebuilding many rounds).
 */
export async function recordRoundDifferential(
  roundId: string,
  userId: string,
  { recalc = true }: { recalc?: boolean } = {}
): Promise<void> {
  const computed = await computeRoundDifferential(roundId, userId);
  if (!computed) return;

  await prisma.$transaction(async (tx) => {
    await tx.handicapHistory.deleteMany({ where: { roundId, userId } });
    if (!computed.result) return;

    await tx.handicapHistory.create({
      data: {
        userId,
        roundId,
        index: computed.index,
        differential: computed.result.differential,
        isNineHole: computed.isNineHole,
        // Preserve chronological position so editing an old round doesn't reorder history
        ...(computed.recordedAt ? { createdAt: computed.recordedAt } : {}),
      },
    });
  });

  if (recalc) await updateHandicapIndex(userId);
}
