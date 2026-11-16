/** Suggestions board rules — pure, shared by the page and the API. */

export const SUGGESTION_TITLE_MAX = 100;
export const SUGGESTION_BODY_MAX = 2000;
export const SUGGESTION_COMMENT_MAX = 1000;

export type SuggestionStatusValue = "OPEN" | "PLANNED" | "DONE" | "NOT_PLANNED";

export const STATUS_LABELS: Record<SuggestionStatusValue, string> = {
  OPEN: "Open",
  PLANNED: "Planned",
  DONE: "Done",
  NOT_PLANNED: "Not planned",
};

/** Still being considered (shown in the main list) vs closed (Done & closed section). */
export const isOpenStatus = (status: SuggestionStatusValue) => status === "OPEN" || status === "PLANNED";

/**
 * Split suggestions into the main list and the closed list. The main list is ordered by
 * votes (most first), then newest; closed ones are newest first.
 */
export function sortSuggestions<T extends { status: SuggestionStatusValue; votes: number; createdAt: Date }>(
  items: T[]
): { open: T[]; closed: T[] } {
  const newest = (a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime();
  return {
    open: items.filter((s) => isOpenStatus(s.status)).sort((a, b) => b.votes - a.votes || newest(a, b)),
    closed: items.filter((s) => !isOpenStatus(s.status)).sort(newest),
  };
}
