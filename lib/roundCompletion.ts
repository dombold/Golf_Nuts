/**
 * Whether a round's scorecard is complete enough to finish.
 * Pure — shared by the /complete route (which enforces it) and the score page (which warns).
 */

import { matchPlayAllowances, netStrokes } from "./formats";
import { isTeamGame } from "./gameFormats";
import { joinNames } from "./teams";

export interface CompletionHole {
  number: number;
  par: number;
  strokeIndex: number;
}

export interface CompletionPlayer {
  name: string;
  playingHandicap: number;
  teamNumber: number | null;
  /** Strokes per hole number; holes without a score are absent (or ≤ 0) */
  scores: Map<number, number>;
}

export interface MissingScores {
  /** Player name, or the team's members for team games */
  name: string;
  holes: number[];
}

const scored = (p: CompletionPlayer, hole: number) => (p.scores.get(hole) ?? 0) > 0;

/**
 * Holes still needing a score, per player (or team). Empty when the round can be finished.
 * - Individual formats: every player needs a score on every hole in play.
 * - Team games (scrambles): each team needs a score on every hole from at least one member.
 * - Match Play: the holes after the match was decided aren't needed (e.g. won 3&2).
 */
export function missingScores(input: {
  format: string;
  stablefordTeamSize?: number;
  /** The holes in play, in playing order */
  holes: CompletionHole[];
  players: CompletionPlayer[];
}): MissingScores[] {
  const { format, stablefordTeamSize, players } = input;
  const holes = [...input.holes].sort((a, b) => a.number - b.number);

  if (isTeamGame(format, stablefordTeamSize)) {
    const teams = new Map<number, CompletionPlayer[]>();
    for (const p of players) teams.set(p.teamNumber ?? 0, [...(teams.get(p.teamNumber ?? 0) ?? []), p]);
    return [...teams.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, members]) => ({
        name: joinNames(members.map((m) => m.name.split(" ")[0])),
        holes: holes.filter((h) => !members.some((m) => scored(m, h.number))).map((h) => h.number),
      }))
      .filter((m) => m.holes.length > 0);
  }

  let needed = holes;
  if (format === "MATCH_PLAY" && players.length === 2) {
    // Walk the holes in order; once the lead exceeds the holes left, the rest aren't needed
    const [p1, p2] = players;
    const [allowance1, allowance2] = matchPlayAllowances(p1.playingHandicap, p2.playingHandicap);
    let diff = 0;
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      if (!scored(p1, h.number) || !scored(p2, h.number)) break;
      const hole = { holeNumber: h.number, par: h.par, strokeIndex: h.strokeIndex };
      const n1 = netStrokes({ ...hole, strokes: p1.scores.get(h.number)! }, allowance1);
      const n2 = netStrokes({ ...hole, strokes: p2.scores.get(h.number)! }, allowance2);
      diff += n1 < n2 ? 1 : n2 < n1 ? -1 : 0;
      if (Math.abs(diff) > holes.length - (i + 1)) {
        needed = holes.slice(0, i + 1);
        break;
      }
    }
  }

  return players
    .map((p) => ({ name: p.name, holes: needed.filter((h) => !scored(p, h.number)).map((h) => h.number) }))
    .filter((m) => m.holes.length > 0);
}

/** "Alice Green — holes 7, 8, 9 · Bob White — hole 9" */
export function formatMissing(missing: MissingScores[]): string {
  return missing
    .map((m) => `${m.name} — hole${m.holes.length !== 1 ? "s" : ""} ${m.holes.join(", ")}`)
    .join(" · ");
}

/** Organiser warning while groups are still out: "Group 2 is still playing — …" */
export function unfinishedGroupsMessage(groupNumbers: number[]): string {
  const groups = groupNumbers.length === 1
    ? `Group ${groupNumbers[0]} is`
    : `Groups ${joinNames(groupNumbers.map(String))} are`;
  return `${groups} still playing — the event completes automatically when the last group finishes its card.`;
}
