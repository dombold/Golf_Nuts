import { z } from "zod";

export const POLL_MAX = 5;
export const POLL_QUESTION_MAX = 200;
export const POLL_OPTION_MAX = 80;
export const POLL_OPTIONS_MIN = 2;
export const POLL_OPTIONS_MAX = 10;

/** A new poll: a question and 2–10 distinct options (blank options are dropped). */
export const PollSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, "Enter a question")
      .max(POLL_QUESTION_MAX, `Keep the question to ${POLL_QUESTION_MAX} characters or fewer`),
    options: z
      .array(
        z.string().trim().max(POLL_OPTION_MAX, `Keep each option to ${POLL_OPTION_MAX} characters or fewer`)
      )
      .max(POLL_OPTIONS_MAX + 5)
      .transform((opts) => opts.filter((o) => o.length > 0)),
  })
  .superRefine(({ options }, ctx) => {
    if (options.length < POLL_OPTIONS_MIN) {
      ctx.addIssue({ code: "custom", path: ["options"], message: `Add at least ${POLL_OPTIONS_MIN} options` });
    } else if (options.length > POLL_OPTIONS_MAX) {
      ctx.addIssue({ code: "custom", path: ["options"], message: `A poll can have at most ${POLL_OPTIONS_MAX} options` });
    }
    const seen = new Set<string>();
    for (const o of options) {
      const key = o.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: ["options"], message: `"${o}" is listed twice` });
        return;
      }
      seen.add(key);
    }
  });

/** First validation message, for showing to the user. */
export function firstIssue(error: z.ZodError, fallback = "Invalid request"): string {
  return error.issues[0]?.message ?? fallback;
}

/**
 * Invited players (accepted or still deciding) can vote while the poll is open
 * and the event hasn't finished. Declined players and non-invitees can't.
 */
export function canVote(
  invitationStatus: string | null | undefined,
  tournamentStatus: string,
  closedAt: Date | string | null
): boolean {
  if (invitationStatus !== "ACCEPTED" && invitationStatus !== "PENDING") return false;
  return tournamentStatus !== "COMPLETE" && closedAt === null;
}

export interface PollInput {
  id: string;
  question: string;
  closedAt: Date | string | null;
  options: { id: string; label: string }[];
  votes: { userId: string; optionId: string; recordedById: string | null; user: { name: string } }[];
}

export interface PollVoter {
  name: string;
  /** The organiser recorded this vote for the player */
  byOrganiser: boolean;
}

export interface PollSummary {
  id: string;
  question: string;
  closed: boolean;
  total: number;
  /** The viewer's current choice, if they've voted (and their vote counts) */
  myOptionId: string | null;
  options: { id: string; label: string; count: number; voters: PollVoter[] }[];
  /** Each counted voter's choice, keyed by user id (for the organiser's "record a vote" picker) */
  votesByUser: Record<string, string>;
}

/**
 * Poll results for display. Only votes from `eligibleUserIds` (invitees who haven't declined)
 * count — a player who declines drops out of the results, and comes back if they re-accept.
 */
export function summarisePoll(poll: PollInput, eligibleUserIds: Set<string>, viewerId: string): PollSummary {
  const votes = poll.votes.filter((v) => eligibleUserIds.has(v.userId));
  return {
    id: poll.id,
    question: poll.question,
    closed: poll.closedAt !== null,
    total: votes.length,
    myOptionId: votes.find((v) => v.userId === viewerId)?.optionId ?? null,
    options: poll.options.map((o) => {
      const voters = votes
        .filter((v) => v.optionId === o.id)
        .map((v) => ({ name: v.user.name, byOrganiser: v.recordedById !== null && v.recordedById !== v.userId }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { id: o.id, label: o.label, count: voters.length, voters };
    }),
    votesByUser: Object.fromEntries(votes.map((v) => [v.userId, v.optionId])),
  };
}

/**
 * Line added to the invite notification for someone invited after polls were added,
 * so they know there's something to vote on. `shorten` trims long questions.
 */
export function invitePollLine(openQuestions: string[], shorten: (q: string) => string = (q) => q): string | null {
  if (openQuestions.length === 0) return null;
  if (openQuestions.length === 1) return `Includes a poll: “${shorten(openQuestions[0])}”`;
  return `Includes ${openQuestions.length} polls to vote on, starting with “${shorten(openQuestions[0])}”`;
}
