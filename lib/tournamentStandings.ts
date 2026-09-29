/**
 * Tournament-wide standings across every group's round.
 * Pure functions — shared by the live leaderboard (client) and server-rendered results.
 */

import { strokesOnHole, stablefordPoints, ambroseTeamHandicap } from "./formats";
import { applyCountback, traceCountback, type CountbackTrace } from "./countback";

export interface StandingsHole {
  number: number;
  strokeIndex: number;
  par: number;
}

export interface StandingsPlayer {
  playingHandicap: number;
  teamNumber: number | null;
  user: { id: string; name: string };
  scores: { holeNumber: number; strokes: number }[];
}

export interface StandingsRound {
  roundNumber: number;
  round: {
    id: string;
    tee?: { holes: StandingsHole[] } | null;
    players: StandingsPlayer[];
  } | null;
}

export interface Standing {
  playerId: string; // player id, or a team key — used by applyCountback
  name: string;
  subName?: string;
  roundId: string;
  groupNumber: number;
  /** Stableford points, otherwise net score relative to par */
  score: number;
  holesPlayed: number;
  countbackLabel?: string;
}

export interface TournamentWinner {
  name: string;
  detail: string;
  countbackLabel?: string;
}

export const isAmbroseFormat = (f: string) => f === "AMBROSE_2" || f === "AMBROSE_4";

function firstName(name: string) {
  return name.split(" ")[0];
}

function total(holeValues: Map<number, number>) {
  let sum = 0;
  for (const v of holeValues.values()) sum += v;
  return sum;
}

export function formatStandingScore(score: number, format: string): string {
  if (format === "STABLEFORD") return `${score} pts`;
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

export interface DetailedStandings {
  standings: Standing[];
  /** Per-entry, per-hole values: Stableford points, otherwise net score to par */
  holeValues: Map<string, Map<number, number>>;
  /** Holes used for countback (the leader's holes) */
  allHoles: number[];
  lowerIsBetter: boolean;
}

export interface CountbackExplanation {
  /** Players/teams level on the top score, in final order */
  tied: Standing[];
  trace: CountbackTrace;
  /** Holes to show in the hole-by-hole table (every hole any step compared) */
  tableHoles: number[];
}

/**
 * Rank every player (or Ambrose team) in the tournament.
 * Stableford ranks by points (high first); other formats by net score to par (low first).
 * Countback is applied when `withCountback` is true (i.e. once the tournament is complete).
 */
export function calcTournamentStandings(
  rounds: StandingsRound[],
  format: string,
  withCountback: boolean
): Standing[] {
  return calcTournamentStandingsDetailed(rounds, format, withCountback).standings;
}

/** As calcTournamentStandings, but also returns the per-hole working used for countback. */
export function calcTournamentStandingsDetailed(
  rounds: StandingsRound[],
  format: string,
  withCountback: boolean
): DetailedStandings {
  const stableford = format === "STABLEFORD";
  const all: Standing[] = [];
  // Per-entry, per-hole values (points or net-to-par) for totals and countback
  const holeValues = new Map<string, Map<number, number>>();

  for (const tr of rounds) {
    const round = tr.round;
    if (!round) continue;
    const holeInfos = new Map((round.tee?.holes ?? []).map((h) => [h.number, h]));

    if (isAmbroseFormat(format)) {
      // One entry per team within each group: best ball per hole, team handicap
      const teams = new Map<number, StandingsPlayer[]>();
      for (const rp of round.players ?? []) {
        const tn = rp.teamNumber ?? 0;
        teams.set(tn, [...(teams.get(tn) ?? []), rp]);
      }
      const teamSize = format === "AMBROSE_2" ? 2 : 4;

      for (const [tn, players] of teams) {
        const teamHandicap = ambroseTeamHandicap(players.map((p) => p.playingHandicap), teamSize);
        const values = new Map<number, number>();
        const holeNumbers = new Set(players.flatMap((p) => p.scores.map((s) => s.holeNumber)));
        for (const holeNum of holeNumbers) {
          const hole = holeInfos.get(holeNum);
          if (!hole) continue;
          const bestBall = Math.min(
            ...players.map((p) => p.scores.find((s) => s.holeNumber === holeNum)?.strokes ?? Infinity)
          );
          if (bestBall === Infinity) continue;
          values.set(holeNum, bestBall - strokesOnHole(teamHandicap, hole.strokeIndex) - hole.par);
        }

        const key = `${round.id}-${tn}`;
        holeValues.set(key, values);
        all.push({
          playerId: key,
          name: tn ? `Team ${tn}` : `Group ${tr.roundNumber}`,
          subName: players.map((p) => firstName(p.user.name)).join(" & "),
          roundId: round.id,
          groupNumber: tr.roundNumber,
          score: total(values),
          holesPlayed: values.size,
        });
      }
    } else {
      for (const rp of round.players ?? []) {
        const values = new Map<number, number>();
        for (const sc of rp.scores) {
          const hole = holeInfos.get(sc.holeNumber);
          if (!hole) continue;
          const net = sc.strokes - strokesOnHole(rp.playingHandicap, hole.strokeIndex);
          values.set(sc.holeNumber, stableford ? stablefordPoints(net, hole.par) : net - hole.par);
        }

        holeValues.set(rp.user.id, values);
        all.push({
          playerId: rp.user.id,
          name: rp.user.name,
          roundId: round.id,
          groupNumber: tr.roundNumber,
          score: total(values),
          holesPlayed: values.size,
        });
      }
    }
  }

  // Anyone who has started ranks above those who haven't; then by score; then holes played
  const sorted = all.sort((a, b) => {
    const started = Number(b.holesPlayed > 0) - Number(a.holesPlayed > 0);
    if (started !== 0) return started;
    const byScore = stableford ? b.score - a.score : a.score - b.score;
    if (byScore !== 0) return byScore;
    return b.holesPlayed - a.holesPlayed;
  });

  const allHoles = sorted[0]
    ? Array.from(holeValues.get(sorted[0].playerId)?.keys() ?? []).sort((a, b) => a - b)
    : [];
  const lowerIsBetter = !stableford;

  const standings = withCountback && sorted.length > 0
    ? applyCountback(sorted, holeValues, lowerIsBetter, allHoles, (e) => e.score)
    : sorted;

  return { standings, holeValues, allHoles, lowerIsBetter };
}

/**
 * How the winner was decided when two or more players/teams finished level on the top score.
 * Returns null when there was an outright winner (no countback needed).
 */
export function explainWinnerCountback(detailed: DetailedStandings): CountbackExplanation | null {
  const { standings, holeValues, allHoles, lowerIsBetter } = detailed;
  const leader = standings[0];
  if (!leader || leader.holesPlayed === 0) return null;

  const tied = standings.filter((s) => s.holesPlayed > 0 && s.score === leader.score);
  if (tied.length < 2) return null;

  const trace = traceCountback(tied.map((s) => s.playerId), holeValues, lowerIsBetter, allHoles);
  const tableHoles = [...new Set(trace.steps.flatMap((step) => step.holes))].sort((a, b) => a - b);
  return { tied, trace, tableHoles };
}

/** Display name for a standing; Ambrose teams include their members. */
export function standingLabel(s: Standing, format: string): string {
  return s.subName && isAmbroseFormat(format) ? `${s.name} (${s.subName})` : s.name;
}

/** The single tournament winner from ranked standings, or null if nobody has scored. */
export function tournamentWinner(standings: Standing[], format: string): TournamentWinner | null {
  const [first, second] = standings;
  if (!first || first.holesPlayed === 0) return null;

  const label = (s: Standing) => standingLabel(s, format);
  const detail = formatStandingScore(first.score, format);

  // A tie that countback couldn't split — share the win
  if (second && second.holesPlayed > 0 && second.score === first.score && !first.countbackLabel) {
    const tied = standings.filter((s) => s.holesPlayed > 0 && s.score === first.score);
    return { name: `${tied.map(label).join(" & ")} (tied)`, detail };
  }

  return { name: label(first), detail, countbackLabel: first.countbackLabel };
}
