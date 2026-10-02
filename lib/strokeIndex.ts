export interface StrokeIndexHole {
  par: number;
  /** Metres; null when unknown */
  meters: number | null;
  /** Published stroke index; null when unknown */
  strokeIndex: number | null;
}

/** A stroke index counts as missing when absent or 0 (0 was the old "unknown" placeholder). */
function isMissing(si: number | null): boolean {
  return si == null || si === 0;
}

/** True when any hole has no published stroke index. */
export function hasMissingStrokeIndexes(holes: StrokeIndexHole[]): boolean {
  return holes.some((h) => isMissing(h.strokeIndex));
}

/**
 * Fill in missing stroke indexes. A complete published set is returned unchanged. Otherwise
 * published values are kept when they are a valid, non-repeating subset of 1..n and the unused
 * values go to the remaining holes, hardest first: longest hole, then higher par, then lower
 * hole number. If the partial values are unusable (duplicates or out of range) every hole is estimated.
 */
export function estimateStrokeIndexes(holes: StrokeIndexHole[]): number[] {
  if (!hasMissingStrokeIndexes(holes)) return holes.map((h) => h.strokeIndex as number);
  const n = holes.length;
  const known = holes.map((h) => (isMissing(h.strokeIndex) ? null : h.strokeIndex));
  const usable = known.filter((si): si is number => si != null);
  const keepKnown =
    usable.every((si) => Number.isInteger(si) && si >= 1 && si <= n) &&
    new Set(usable).size === usable.length;

  const result: (number | null)[] = keepKnown ? [...known] : holes.map(() => null);
  const used = new Set(result.filter((si): si is number => si != null));
  const free = Array.from({ length: n }, (_, i) => i + 1).filter((si) => !used.has(si));

  const open = holes
    .map((h, i) => ({ i, meters: h.meters ?? 0, par: h.par }))
    .filter(({ i }) => result[i] == null)
    .sort((a, b) => b.meters - a.meters || b.par - a.par || a.i - b.i);

  open.forEach(({ i }, rank) => {
    result[i] = free[rank];
  });
  return result as number[];
}
