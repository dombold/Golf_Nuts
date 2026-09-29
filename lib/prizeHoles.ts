import { isHoleInPlay } from "./nines";

export interface PrizeHoleInput {
  holeNumber: number;
  type: "LONGEST_DRIVE" | "NEAREST_PIN";
}

/**
 * Prize-hole rules: every prize hole must be in play, and each nine may have at most
 * two Nearest the Pin holes and one Longest Drive hole. Returns an error message, or null if valid.
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
    if (onNine.filter((h) => h.type === "NEAREST_PIN").length > 2 ||
        onNine.filter((h) => h.type === "LONGEST_DRIVE").length > 1) {
      return "Too many prize holes of the same type per nine";
    }
  }
  return null;
}
