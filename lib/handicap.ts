/**
 * World Handicap System (WHS) calculations
 */

export interface RoundData {
  adjustedGrossScore: number;
  courseRating: number;
  slopeRating: number;
}

/** Score Differential = (AGS − Course Rating) × (113 / Slope Rating) */
export function calcDifferential(round: RoundData): number {
  const diff =
    (round.adjustedGrossScore - round.courseRating) *
    (113 / round.slopeRating);
  return Math.round(diff * 10) / 10;
}

/**
 * Handicap Index = average of the best 8 score differentials from the last 20 rounds.
 * Fewer rounds use a sliding scale.
 */
export function calcHandicapIndex(differentials: number[]): number {
  const recent = differentials.slice(-20);
  const sorted = [...recent].sort((a, b) => a - b);

  const count = sorted.length;
  let bestCount: number;

  if (count >= 20) bestCount = 8;
  else if (count >= 19) bestCount = 7;
  else if (count >= 17) bestCount = 6;
  else if (count >= 15) bestCount = 5;
  else if (count >= 13) bestCount = 4;
  else if (count >= 11) bestCount = 3;
  else if (count >= 9) bestCount = 2;
  else if (count >= 7) bestCount = 1;
  else if (count >= 5) bestCount = 1;
  else if (count >= 3) bestCount = 1;
  else return 0;

  const best = sorted.slice(0, bestCount);
  const avg = best.reduce((a, b) => a + b, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Playing Handicap = Handicap Index × (Slope / 113) + (Course Rating − Par)
 * Rounded to nearest whole number.
 */
export function calcPlayingHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  const ph =
    handicapIndex * (slopeRating / 113) + (courseRating - par);
  return Math.round(ph);
}
