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

  // Separate 18-hole and 9-hole (half) differentials
  const fullDiffs = eligible.filter((h) => !h.isNineHole).map((h) => h.differential);
  const halfDiffs = eligible.filter((h) => h.isNineHole).map((h) => h.differential);

  // Pair consecutive 9-hole halves into 18-hole equivalents (oldest first).
  // An unpaired trailing entry is intentionally dropped per WHS rules.
  const combinedFromNine: number[] = [];
  for (let i = 0; i + 1 < halfDiffs.length; i += 2) {
    combinedFromNine.push(halfDiffs[i] + halfDiffs[i + 1]);
  }

  const allDiffs = [...fullDiffs, ...combinedFromNine];

  if (allDiffs.length < 3) return null;
  return calcHandicapIndex(allDiffs);
}
