import { z } from "zod";

/** Pure guest-player rules (no DB) — shared by the API routes and the client forms. */

export const GuestInputSchema = z.object({
  name: z.string().trim().min(2, "Guest name must be at least 2 characters").max(40, "Guest name must be 40 characters or fewer"),
  handicapIndex: z.number().min(0, "Handicap must be 0 or above").max(54, "Handicap must be 54 or below"),
});
export type GuestInput = z.infer<typeof GuestInputSchema>;

/** Collapse whitespace so "Pete  Smith " and "pete smith" compare equal. */
export function normaliseGuestName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Reserved words and clashes with other guests in the same event/round.
 * Returns an error message, or null when the name is fine.
 */
export function guestNameProblem(name: string, otherGuestNames: string[]): string | null {
  const n = normaliseGuestName(name);
  // "Guest …" is reserved for anonymised guests; guest_ is the placeholder username prefix
  if (/^guest(\b|_)/i.test(n)) return "Guest names can't start with \"Guest\" — use the player's real name";
  const lower = n.toLowerCase();
  if (otherGuestNames.some((o) => normaliseGuestName(o).toLowerCase() === lower)) {
    return `There's already a guest called ${n} — add a surname initial to tell them apart`;
  }
  return null;
}
