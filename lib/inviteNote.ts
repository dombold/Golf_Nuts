import { z } from "zod";

export const INVITE_NOTE_MAX = 500;

/** The organiser's optional note to invitees — blank saves as null. */
export const InviteNoteSchema = z
  .string()
  .trim()
  .max(INVITE_NOTE_MAX, `Keep the note to ${INVITE_NOTE_MAX} characters or fewer`)
  .transform((s) => s || null);

/** Shortened note for push notifications, which the OS truncates anyway. */
export function notificationNote(note: string, max = 150) {
  return note.length > max ? `${note.slice(0, max - 1).trimEnd()}…` : note;
}
