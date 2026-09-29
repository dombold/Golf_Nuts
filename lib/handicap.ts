/**
 * World Handicap System (WHS) calculations
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface HandicapHole {
  number: number;
  par: number;
  strokeIndex: number;
  /** null when the hole wasn't played */
  strokes: number | null;
}

/**
 * Course Handicap = Handicap Index × (Slope / 113) + (Course Rating − Par), rounded.
 * For 9 holes pass half the index, half the course rating and the par of the nine.
 */
export function courseHandicap(handicapIndex: number, slopeRating: number, courseRating: number, par: number): number {
  return Math.round(handicapIndex * (slopeRating / 113) + (courseRating - par));
}

/**
 * Handicap strokes received on each hole in play. Holes are ranked by stroke index (1…n), so a
 * nine whose SIs are e.g. 2,4,…,18 still allocates strokes hardest-first. A plus handicap
 * (negative CH) gives strokes back starting from the easiest holes.
 */
export function allocateStrokes(
  courseHandicap: number,
  holes: { number: number; strokeIndex: number }[]
): Map<number, number> {
  const n = holes.length;
  const ranked = [...holes].sort((a, b) => a.strokeIndex - b.strokeIndex);
  const strokes = new Map<number, number>();
  const size = Math.abs(courseHandicap);
  const full = n > 0 ? Math.floor(size / n) : 0;
  const extra = n > 0 ? size % n : 0;

  ranked.forEach((hole, i) => {
    const rank = i + 1;
    if (courseHandicap >= 0) {
      strokes.set(hole.number, full + (rank <= extra ? 1 : 0));
    } else {
      strokes.set(hole.number, -(full + (rank > n - extra ? 1 : 0)) || 0); // avoid -0
    }
  });
  return strokes;
}

/**
 * Adjusted Gross Score (WHS Rule 3.1 / 3.2): each played hole is capped at net double bogey
 * (par + 2 + strokes received); a hole not played counts as net par (par + strokes received).
 */
export function adjustedGrossScore(holes: HandicapHole[], courseHandicap: number): { ags: number; holesPlayed: number } {
  const received = allocateStrokes(courseHandicap, holes);
  let ags = 0;
  let holesPlayed = 0;
  for (const hole of holes) {
    const shots = received.get(hole.number) ?? 0;
    if (hole.strokes !== null && hole.strokes > 0) {
      holesPlayed++;
      ags += Math.min(hole.strokes, hole.par + 2 + shots);
    } else {
      ags += hole.par + shots;
    }
  }
  return { ags, holesPlayed };
}

/** WHS Rule 5.1: fewest holes that must be played for a score to count. */
export function minHolesForScore(holesCount: 9 | 18): number {
  return holesCount === 9 ? 7 : 14;
}

/** WHS Rule 5.1b (2024): expected 9-hole Score Differential for the nine not played. */
export function expectedNineHoleDifferential(handicapIndex: number): number {
  return round1(0.52 * handicapIndex + 1.2);
}

export interface ScoreDifferentialInput {
  holesCount: 9 | 18;
  /** 18-hole course rating and slope of the tee played */
  courseRating: number;
  slopeRating: number;
  /** Handicap Index at the time of play */
  handicapIndex: number;
  /** The holes in play (all 18, or the nine played) */
  holes: HandicapHole[];
}

/**
 * The 18-hole Score Differential for a round, or null if too few holes were played.
 *
 * 18 holes: (AGS − CR) × 113 / Slope, with AGS capped at net double bogey.
 * 9 holes:  (AGS9 − CR/2) × 113 / Slope, plus the expected differential for the other nine.
 *           Tees store only 18-hole ratings, so half the course rating and the full slope stand
 *           in for the nine's own ratings.
 */
export function scoreDifferential(input: ScoreDifferentialInput): { differential: number; ags: number } | null {
  const { holesCount, courseRating, slopeRating, handicapIndex, holes } = input;
  const nine = holesCount === 9;
  const rating = nine ? courseRating / 2 : courseRating;
  const par = holes.reduce((sum, h) => sum + h.par, 0);
  const ch = courseHandicap(nine ? handicapIndex / 2 : handicapIndex, slopeRating, rating, par);

  const { ags, holesPlayed } = adjustedGrossScore(holes, ch);
  if (holesPlayed < minHolesForScore(holesCount)) return null;

  const played = round1((ags - rating) * (113 / slopeRating));
  const differential = nine ? round1(played + expectedNineHoleDifferential(handicapIndex)) : played;
  return { differential, ags };
}

/**
 * WHS Rule 5.2a: how many of the lowest differentials count, and the adjustment applied,
 * for a given number of differentials in the scoring record (max 20).
 */
const WHS_TABLE: { minCount: number; best: number; adjustment: number }[] = [
  { minCount: 20, best: 8, adjustment: 0 },
  { minCount: 19, best: 7, adjustment: 0 },
  { minCount: 17, best: 6, adjustment: 0 },
  { minCount: 15, best: 5, adjustment: 0 },
  { minCount: 12, best: 4, adjustment: 0 },
  { minCount: 9, best: 3, adjustment: 0 },
  { minCount: 7, best: 2, adjustment: 0 },
  { minCount: 6, best: 2, adjustment: -1 },
  { minCount: 5, best: 1, adjustment: 0 },
  { minCount: 4, best: 1, adjustment: -1 },
  { minCount: 3, best: 1, adjustment: -2 },
];

/**
 * Handicap Index = average of the best differentials from the last 20 (WHS table above).
 * Returns null with fewer than 3 differentials.
 */
export function calcHandicapIndex(differentials: number[]): number | null {
  const recent = differentials.slice(-20);
  const row = WHS_TABLE.find((r) => recent.length >= r.minCount);
  if (!row) return null;

  const best = [...recent].sort((a, b) => a - b).slice(0, row.best);
  const avg = best.reduce((a, b) => a + b, 0) / best.length + row.adjustment;
  return Math.round(avg * 10) / 10;
}

/** Playing Handicap used for scoring formats — the 18-hole Course Handicap at 100% allowance. */
export const calcPlayingHandicap = courseHandicap;
