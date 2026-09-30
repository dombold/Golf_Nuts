import { prisma } from "@/lib/prisma";
import { computeRoundDifferential, recalcHandicap, recordRoundDifferential, updateHandicapIndex } from "@/lib/recalcHandicap";

export interface HandicapChange {
  userId: string;
  name: string;
  isGuest: boolean;
  before: number;
  /** null: too little history — the current index is kept */
  after: number | null;
}

export interface RebuildResult {
  dryRun: boolean;
  roundsRebuilt: number;
  changes: HandicapChange[];
}

/**
 * Recompute every completed strokeplay round's differential with the current WHS method
 * (net double bogey, 9-hole expected score), then recalculate indexes. Each history row keeps
 * the Handicap Index and date recorded when the round was first completed.
 *
 * `userId` limits the rebuild to one member's rounds. `dryRun` writes nothing and reports
 * what would change. Members with too little history (< 3 counting differentials) keep their
 * current index, matching how the app behaves when a round is completed.
 */
export async function rebuildHandicaps({ userId, dryRun }: { userId?: string; dryRun: boolean }): Promise<RebuildResult> {
  // roundId → new differential (null = row would be dropped), per user
  const overrides = new Map<string, Map<string, number | null>>();

  const rounds = await prisma.round.findMany({
    where: { status: "COMPLETE", format: "STROKEPLAY", ...(userId ? { players: { some: { userId } } } : {}) },
    select: { id: true, players: { select: { userId: true } } },
    orderBy: { date: "asc" },
  });

  let roundsRebuilt = 0;
  for (const round of rounds) {
    for (const player of round.players) {
      if (userId && player.userId !== userId) continue;
      if (dryRun) {
        const computed = await computeRoundDifferential(round.id, player.userId);
        if (!overrides.has(player.userId)) overrides.set(player.userId, new Map());
        overrides.get(player.userId)!.set(round.id, computed?.result?.differential ?? null);
      } else {
        await recordRoundDifferential(round.id, player.userId, { recalc: false });
      }
      roundsRebuilt++;
    }
  }

  const users = await prisma.user.findMany({
    where: userId ? { id: userId } : {},
    select: { id: true, name: true, isGuest: true, handicapIndex: true },
    orderBy: { name: "asc" },
  });

  const changes: HandicapChange[] = [];
  for (const user of users) {
    // In a dry run the rebuilt differentials exist only in memory, so pass them through
    const after = dryRun ? await recalcHandicap(user.id, overrides.get(user.id)) : await updateHandicapIndex(user.id);
    changes.push({ userId: user.id, name: user.name, isGuest: user.isGuest, before: user.handicapIndex, after });
  }

  return { dryRun, roundsRebuilt, changes };
}
