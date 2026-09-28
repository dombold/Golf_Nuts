import { prisma } from "@/lib/prisma";
import { calcHandicapIndex } from "@/lib/handicap";

/**
 * Recalculates a user's handicap index from their full HandicapHistory,
 * excluding any rounds the user has opted out of.
 *
 * 9-hole rounds are stored as half-differentials. Two consecutive 9-hole
 * half-differentials are combined (summed) to form one 18-hole equivalent
 * before being passed into the index calculation. An unpaired 9-hole entry
 * is ignored (WHS: a lone 9-hole score has no effect on the index).
 */
export async function recalcHandicap(userId: string): Promise<number | null> {
  const [allHistory, excludedPlayers] = await Promise.all([
    prisma.handicapHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { differential: true, roundId: true, isNineHole: true },
    }),
    prisma.roundPlayer.findMany({
      where: { userId, excludeFromHandicap: true },
      select: { roundId: true },
    }),
  ]);

  // Only STROKEPLAY rounds count under WHS — look up the format for each roundId
  const roundIds = allHistory.map((h) => h.roundId).filter((id): id is string => id !== null);
  const strokeplayRounds = await prisma.round.findMany({
    where: { id: { in: roundIds }, format: "STROKEPLAY" },
    select: { id: true },
  });
  const strokeplayIds = new Set(strokeplayRounds.map((r) => r.id));

  const excludedRoundIds = new Set(excludedPlayers.map((p) => p.roundId));

  const eligible = allHistory.filter(
    (h) =>
      h.roundId !== null &&
      strokeplayIds.has(h.roundId) &&
      !excludedRoundIds.has(h.roundId)
  );

  // Walk in chronological order, pairing consecutive 9-hole halves on the fly.
  // This preserves true date ordering so slice(-20) in calcHandicapIndex picks
  // the 20 most recently played rounds, not the 20 most recently concatenated.
  // An unpaired trailing 9-hole entry is intentionally dropped per WHS rules.
  const allDiffs: number[] = [];
  let pendingHalf: number | null = null;

  for (const h of eligible) {
    if (!h.isNineHole) {
      allDiffs.push(h.differential);
    } else {
      if (pendingHalf !== null) {
        allDiffs.push(pendingHalf + h.differential);
        pendingHalf = null;
      } else {
        pendingHalf = h.differential;
      }
    }
  }

  if (allDiffs.length < 3) return null;
  return calcHandicapIndex(allDiffs);
}
