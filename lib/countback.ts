/**
 * Scorecard countback tie-breaking for golf.
 *
 * Standard order:
 *  18-hole (start 1): back 9 → last 6 → last 3 → hole 18, 17, 16…
 *  9-hole  (start 1): last 5 → last 3 → hole 9, 8, 7…
 *  9-hole  (start 10): last 5 → last 3 → hole 18, 17, 16…
 */

export interface CountbackRange {
  holes: number[];
  /** Short result label, e.g. "Won on back 9" */
  label: string;
  /** Readable description of the holes compared, e.g. "Back 9 (holes 10–18)" */
  description: string;
}

function holeSpan(holes: number[]) {
  return `holes ${holes[0]}–${holes[holes.length - 1]}`;
}

export function buildCountbackRanges(allHoles: number[]): CountbackRange[] {
  const sorted = [...allHoles].sort((a, b) => a - b);
  const n = sorted.length;
  const ranges: CountbackRange[] = [];
  const add = (holes: number[], label: string, name: string) =>
    ranges.push({ holes, label, description: `${name} (${holeSpan(holes)})` });

  if (n === 18) {
    // Standard 18-hole
    add(sorted.slice(9), "Won on back 9", "Back 9");
    add(sorted.slice(12), "Won on last 6 holes", "Last 6 holes");
    add(sorted.slice(15), "Won on last 3 holes", "Last 3 holes");
  } else if (n === 9) {
    // 9-hole round
    add(sorted.slice(4), "Won on last 5 holes", "Last 5 holes");
    add(sorted.slice(6), "Won on last 3 holes", "Last 3 holes");
  }

  // Individual holes from last back to first
  for (let i = n - 1; i >= 0; i--) {
    ranges.push({ holes: [sorted[i]], label: `Won on hole ${sorted[i]}`, description: `Hole ${sorted[i]}` });
  }

  return ranges;
}

function sumRange(
  holeValues: Map<number, number>,
  holes: number[]
): number {
  return holes.reduce((sum, h) => sum + (holeValues.get(h) ?? 0), 0);
}

export interface CountbackStep {
  label: string;
  description: string;
  holes: number[];
  /** Totals over `holes` for every player still in contention at this step */
  totals: { playerId: string; total: number }[];
  /** Players still level after this step */
  remaining: string[];
  /** Players who fell behind at this step */
  dropped: string[];
}

export interface CountbackTrace {
  steps: CountbackStep[];
  /** The player who won the countback, or null if the tie could not be split */
  winnerId: string | null;
  /** Final placing of the tied players: survivors first, then later drop-outs ahead of earlier ones */
  order: string[];
}

/**
 * Break a tie between `tied` players step by step. Players who fall behind at a step are
 * eliminated; the rest carry on to the next step until one player is ahead.
 */
export function traceCountback(
  tied: string[],
  holeValues: Map<string, Map<number, number>>,
  lowerIsBetter: boolean,
  allHoles: number[]
): CountbackTrace {
  const steps: CountbackStep[] = [];
  const droppedInOrder: string[][] = [];
  let remaining = [...tied];

  for (const range of buildCountbackRanges(allHoles)) {
    if (remaining.length < 2) break;

    const totals = remaining.map((playerId) => ({
      playerId,
      total: sumRange(holeValues.get(playerId) ?? new Map(), range.holes),
    }));
    const best = lowerIsBetter
      ? Math.min(...totals.map((t) => t.total))
      : Math.max(...totals.map((t) => t.total));
    const leaders = totals.filter((t) => t.total === best).map((t) => t.playerId);
    const dropped = totals
      .filter((t) => t.total !== best)
      .sort((a, b) => (lowerIsBetter ? a.total - b.total : b.total - a.total))
      .map((t) => t.playerId);

    steps.push({ label: range.label, description: range.description, holes: range.holes, totals, remaining: leaders, dropped });
    if (dropped.length > 0) droppedInOrder.push(dropped);
    remaining = leaders;
  }

  const winnerId = remaining.length === 1 ? remaining[0] : null;
  // Later drop-outs finished ahead of earlier ones
  const order = [...remaining, ...droppedInOrder.reverse().flat()];
  return { steps, winnerId, order };
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
  const result: T[] = [];
  let i = 0;

  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && getScore(sorted[j]) === getScore(sorted[i])) {
      j++;
    }

    const group = sorted.slice(i, j);
    i = j;

    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const trace = traceCountback(group.map((p) => p.playerId), holeValues, lowerIsBetter, allHoles);
    const byId = new Map(group.map((p) => [p.playerId, p]));
    const ordered = trace.order.map((id) => byId.get(id)!);

    // Tag the winner only when the tie was actually split
    const decidingStep = trace.steps[trace.steps.length - 1];
    if (trace.winnerId && decidingStep) {
      ordered[0] = { ...ordered[0], countbackLabel: decidingStep.label };
    }
    result.push(...ordered);
  }

  return result;
}
