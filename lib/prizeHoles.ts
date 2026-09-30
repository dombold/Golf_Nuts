import { isHoleInPlay } from "./nines";

export type PrizeType = "LONGEST_DRIVE" | "NEAREST_PIN";

export interface PrizeHoleInput {
  holeNumber: number;
  type: PrizeType;
}

/** Most prize holes of each type allowed on one nine. */
export const MAX_PER_NINE = { LONGEST_DRIVE: 2, NEAREST_PIN: 2 } as const;

const onSameNine = (a: number, b: number) => (a <= 9) === (b <= 9);

/**
 * Prize-hole rules: every prize hole must be in play, each hole has at most one prize, and each
 * nine may have up to two Longest Drive and two Nearest the Pin holes. Any par is allowed here —
 * the picker offers par 3s for Nearest the Pin and par 4s/5s for Longest Drive.
 * Returns an error message, or null if valid.
 */
export function validatePrizeHoles(
  prizeHoles: PrizeHoleInput[],
  holesCount: number,
  startingHole: number
): string | null {
  if (prizeHoles.some((h) => !isHoleInPlay(h.holeNumber, holesCount, startingHole))) {
    return "Prize holes must be on the holes being played";
  }
  if (new Set(prizeHoles.map((h) => h.holeNumber)).size !== prizeHoles.length) {
    return "Each hole can only have one prize";
  }
  for (const frontNine of [true, false]) {
    const onNine = prizeHoles.filter((h) => (h.holeNumber <= 9) === frontNine);
    for (const type of ["LONGEST_DRIVE", "NEAREST_PIN"] as const) {
      if (onNine.filter((h) => h.type === type).length > MAX_PER_NINE[type]) {
        return "Too many prize holes of the same type per nine";
      }
    }
  }
  return null;
}

/**
 * Picker selection: a selected hole is deselected; otherwise it's added as `type` unless that
 * nine already has the maximum of that type, in which case nothing changes.
 */
export function togglePrizeHole(selected: PrizeHoleInput[], holeNumber: number, type: PrizeType): PrizeHoleInput[] {
  if (selected.some((p) => p.holeNumber === holeNumber)) {
    return selected.filter((p) => p.holeNumber !== holeNumber);
  }
  const sameTypeAndNine = selected.filter((p) => p.type === type && onSameNine(p.holeNumber, holeNumber));
  if (sameTypeAndNine.length >= MAX_PER_NINE[type]) return selected;
  return [...selected, { holeNumber, type }];
}
