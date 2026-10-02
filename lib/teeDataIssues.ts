import type { TeeDataIssue } from "@/app/generated/prisma/enums";

export type { TeeDataIssue };

/** Placeholder slope used when a tee's real slope rating is unknown. */
export const PLACEHOLDER_SLOPE = 113;

const LABELS: Record<TeeDataIssue, string> = {
  STROKE_INDEX: "stroke indexes (estimated from hole lengths)",
  RATING: "course rating & slope (placeholder values used)",
  HOLE_LENGTHS: "hole lengths",
};

/** A tee with any missing or estimated scorecard data. Its rounds never count for handicaps. */
export function isIncompleteTee(tee: { dataIssues?: readonly TeeDataIssue[] | null }): boolean {
  return (tee.dataIssues?.length ?? 0) > 0;
}

/** Human-readable list of what is missing, in a stable order. */
export function describeDataIssues(issues: readonly TeeDataIssue[]): string[] {
  return (Object.keys(LABELS) as TeeDataIssue[]).filter((k) => issues.includes(k)).map((k) => LABELS[k]);
}

const SHORT_LABELS: Record<TeeDataIssue, string> = {
  STROKE_INDEX: "Stroke indexes",
  RATING: "Rating & slope",
  HOLE_LENGTHS: "Hole lengths",
};

/** Compact labels for admin lists, in a stable order. */
export function shortDataIssueLabels(issues: readonly TeeDataIssue[]): string[] {
  return (Object.keys(SHORT_LABELS) as TeeDataIssue[]).filter((k) => issues.includes(k)).map((k) => SHORT_LABELS[k]);
}

/** Every issue found on any of a course's tees (for a course-level notice). */
export function courseDataIssues(tees: readonly { dataIssues: readonly TeeDataIssue[] }[]): TeeDataIssue[] {
  const all = new Set(tees.flatMap((t) => t.dataIssues));
  return (Object.keys(LABELS) as TeeDataIssue[]).filter((k) => all.has(k));
}

/** Course rating for display — "n/a" when only a placeholder is stored. */
export function displayRating(tee: { rating: number; dataIssues?: readonly TeeDataIssue[] | null }): string {
  return tee.dataIssues?.includes("RATING") ? "n/a" : String(tee.rating);
}

/** Slope rating for display — "n/a" when only a placeholder is stored. */
export function displaySlope(tee: { slope: number; dataIssues?: readonly TeeDataIssue[] | null }): string {
  return tee.dataIssues?.includes("RATING") ? "n/a" : String(tee.slope);
}
