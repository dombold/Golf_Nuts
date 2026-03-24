import { prisma } from "@/lib/prisma";
import { calcHandicapIndex } from "@/lib/handicap";

/**
 * Recalculates a user's handicap index from their full HandicapHistory,
 * excluding any rounds the user has opted out of.
 */
export async function recalcHandicap(userId: string): Promise<number> {
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

  const excludedRoundIds = new Set(excludedPlayers.map((p) => p.roundId));

  const differentials = allHistory
    .filter((h) => !h.roundId || !excludedRoundIds.has(h.roundId))
    .map((h) => h.differential);

  return calcHandicapIndex(differentials);
}
