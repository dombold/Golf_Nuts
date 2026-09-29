export type HolesCount = 9 | 18;
export type StartingHole = 1 | 10;

/** Tee names like "Red/Blue" describe two named nines; returns null for a plain tee name. */
export function parseNineNames(teeName: string): { front: string; back: string } | null {
  const parts = teeName.split("/");
  return parts.length === 2 ? { front: parts[0].trim(), back: parts[1].trim() } : null;
}

/** Whether a hole number falls within the nine(s) being played. */
export function isHoleInPlay(holeNumber: number, holesCount: number, startingHole: number): boolean {
  return holeNumber >= startingHole && holeNumber < startingHole + holesCount;
}

/** Human-readable label, e.g. "18 holes" or "9 holes — Back 9". */
export function describeHoles(holesCount: number, startingHole: number, teeName?: string | null): string {
  if (holesCount !== 9) return "18 holes";
  const names = teeName ? parseNineNames(teeName) : null;
  const nine = startingHole === 10 ? (names?.back ?? "Back 9") : (names?.front ?? "Front 9");
  return `9 holes — ${nine}`;
}
