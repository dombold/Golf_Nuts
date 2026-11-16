/**
 * Golf Nuts release history, shown on /whats-new. Newest first.
 *
 * Every user-visible change adds a line here (or a new release on top) and bumps the
 * version in package.json to match. Write for players, not developers: say what they can
 * now do, and leave out dependency bumps, refactors and deploy fixes — security patches are
 * rolled up as "Security updates".
 */

export type ChangeKind = "new" | "improved" | "fixed";

export interface Release {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  changes: { kind: ChangeKind; text: string }[];
}

export const RELEASES: Release[] = [
  {
    version: "1.7.0",
    date: "2026-11-16",
    title: "What's New & Suggestions",
    changes: [
      { kind: "new", text: "This What's New page — see what's changed in each version of the app." },
      { kind: "new", text: "Suggestions: share an idea or report a problem, vote for the ones you want most, and discuss them in the comments. Popular suggestions rise to the top." },
      { kind: "improved", text: "Administrators can find any course and add hole coordinates, so mapped holes show a satellite view while you score." },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-11-16",
    title: "Late withdrawals",
    changes: [
      { kind: "new", text: "Organisers can withdraw a player from a group after an event has started. In 2-ball games, a partner left on their own joins the other team — a group of four becomes a team of three." },
      { kind: "improved", text: "Players can see an event's groups and teams before the round starts." },
      { kind: "new", text: "Fireworks when you or your team score a birdie or better." },
      { kind: "improved", text: "The guide explains how the Ambrose team handicap uses each player's Course Handicap, and how late withdrawals work." },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-11-10",
    title: "Score without signal",
    changes: [
      { kind: "new", text: "Offline scoring: with no signal, scores are kept on your phone and sent automatically when you're back in range." },
      { kind: "improved", text: "If two phones change the same score, the one entered last wins." },
      { kind: "fixed", text: "Security updates." },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-11-04",
    title: "Event polls",
    changes: [
      { kind: "new", text: "Organisers can add polls to an event — lunch orders, tee times, anything the group needs to decide." },
      { kind: "new", text: "View Card tab on the scoring page to see the whole scorecard while you play." },
      { kind: "fixed", text: "Security updates." },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-10-03",
    title: "Tee times & course data",
    changes: [
      { kind: "new", text: "Events can have a tee off time." },
      { kind: "new", text: "Organisers can add a note to event invites, and invite registered players after the event is set up." },
      { kind: "new", text: "Courses with incomplete scorecard data are flagged, and you can send in a photo of the real scorecard." },
      { kind: "improved", text: "Course names and tees tidied up (Armadale is now The Springs Club)." },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-09-30",
    title: "The big events update",
    changes: [
      { kind: "new", text: "Ambrose (2-ball and 4-ball) and team Stableford, with fair handling of odd numbers." },
      { kind: "new", text: "Skins events with a winner per group, and an option to carry over halved holes." },
      { kind: "new", text: "One live leaderboard across all groups and a single overall winner, with ties decided by countback (and a page explaining how)." },
      { kind: "new", text: "Guest players for events and casual rounds." },
      { kind: "new", text: "Prize holes: Nearest the Pin and Longest Drive winners." },
      { kind: "new", text: "9-hole events, and organisers can lock scores once an event is finished." },
      { kind: "improved", text: "Handicaps follow the World Handicap System more closely (net double bogey, plus handicaps, 9-hole rounds)." },
      { kind: "improved", text: "Front and back nine subtotals and team columns on scorecards." },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-05-12",
    title: "Notifications & passkeys",
    changes: [
      { kind: "new", text: "Push notifications for event invites and updates." },
      { kind: "new", text: "Sign in with a passkey (Face ID, fingerprint or device PIN)." },
      { kind: "new", text: "Randomise Teams when arranging event groups." },
      { kind: "new", text: "Prize holes on events." },
      { kind: "improved", text: "Redesigned hole info panel, with tee lengths shown on each course." },
      { kind: "improved", text: "9-hole rounds count toward your handicap under the World Handicap System." },
      { kind: "fixed", text: "Strokeplay leaderboards show net to par." },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-24",
    title: "Golf Nuts launches",
    changes: [
      { kind: "new", text: "Live scoring for Strokeplay, Stableford, Match Play, Skins and Ambrose." },
      { kind: "new", text: "Import courses with their tees, ratings and stroke indexes." },
      { kind: "new", text: "Stats and handicap tracking." },
      { kind: "new", text: "Tournaments with invitations and groups." },
      { kind: "new", text: "Install Golf Nuts on your phone like an app." },
    ],
  },
];

export const APP_VERSION = RELEASES[0].version;

/** "16 Nov 2026" from "2026-11-16" — parsed as a calendar date, no time zone shifts. */
export function formatReleaseDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${d} ${month} ${y}`;
}
