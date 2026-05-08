/**
 * Scorecard countback tie-breaking for golf.
 *
 * Standard order:
 *  18-hole (start 1): back 9 → last 6 → last 3 → hole 18, 17, 16…
 *  9-hole  (start 1): last 5 → last 3 → hole 9, 8, 7…
 *  9-hole  (start 10): last 5 → last 3 → hole 18, 17, 16…
 */

export function buildCountbackRanges(
  allHoles: number[]
): { holes: number[]; label: string }[] {
  const sorted = [...allHoles].sort((a, b) => a - b);
  const n = sorted.length;
  const ranges: { holes: number[]; label: string }[] = [];

  if (n === 18) {
    // Standard 18-hole
    ranges.push({ holes: sorted.slice(9), label: "Won on back 9" });
    ranges.push({ holes: sorted.slice(12), label: "Won on last 6 holes" });
    ranges.push({ holes: sorted.slice(15), label: "Won on last 3 holes" });
  } else if (n === 9) {
    // 9-hole round
    ranges.push({ holes: sorted.slice(4), label: "Won on last 5 holes" });
    ranges.push({ holes: sorted.slice(6), label: "Won on last 3 holes" });
  }

  // Individual holes from last back to first
  for (let i = n - 1; i >= 0; i--) {
    ranges.push({ holes: [sorted[i]], label: `Won on hole ${sorted[i]}` });
  }

  return ranges;
}

function sumRange(
  holeValues: Map<number, number>,
  holes: number[]
): number {
  return holes.reduce((sum, h) => sum + (holeValues.get(h) ?? 0), 0);
}

/**
 * Given a pre-sorted array, groups consecutive tied entries and resolves each
 * group using the countback ranges. Sets `countbackLabel` on the winner of each
 * resolved tie. Returns the array in final order.
 */
export function applyCountback<
  T extends { playerId: string; countbackLabel?: string }
>(
  sorted: T[],
  holeValues: Map<string, Map<number, number>>,
  lowerIsBetter: boolean,
  allHoles: number[],
  getScore: (t: T) => number
): T[] {
  if (sorted.length === 0) return sorted;

  const ranges = buildCountbackRanges(allHoles);
  const result: T[] = [];
  let i = 0;

  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && getScore(sorted[j]) === getScore(sorted[i])) {
      j++;
    }

    const group = sorted.slice(i, j);

    if (group.length === 1) {
      result.push(group[0]);
      i = j;
      continue;
    }

    // Try each range until the group is reduced to a single winner
    let resolved = group;
    let winnerLabel: string | undefined;

    for (const range of ranges) {
      const withTotals = resolved.map((p) => ({
        player: p,
        total: sumRange(holeValues.get(p.playerId) ?? new Map(), range.holes),
      }));

      const best = lowerIsBetter
        ? Math.min(...withTotals.map((x) => x.total))
        : Math.max(...withTotals.map((x) => x.total));

      const winners = withTotals.filter((x) => x.total === best);

      if (winners.length < resolved.length) {
        winnerLabel = range.label;
        // Sort within this resolution: winners first, then remaining tied members
        const losers = withTotals.filter((x) => x.total !== best);
        resolved = [
          ...winners.map((x) => x.player),
          ...losers.map((x) => x.player),
        ];
        if (winners.length === 1) break; // Unique winner found
      }
    }

    // Tag the single winner if the tie was resolved
    const taggedGroup = resolved.map((p, idx) => {
      if (idx === 0 && winnerLabel && resolved.length > 1) {
        return { ...p, countbackLabel: winnerLabel };
      }
      return p;
    });

    result.push(...taggedGroup);
    i = j;
  }

  return result;
}
