/**
 * Tournament-wide standings across every group's round.
 * Pure functions — shared by the live leaderboard (client) and server-rendered results.
 */

import { strokesOnHole, stablefordPoints, ambroseTeamHandicap } from "./formats";
import { applyCountback } from "./countback";

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

  if (!withCountback || sorted.length === 0) return sorted;

  const allHoles = Array.from(holeValues.get(sorted[0].playerId)?.keys() ?? []).sort((a, b) => a - b);
  return applyCountback(sorted, holeValues, !stableford, allHoles, (e) => e.score);
}

/** The single tournament winner from ranked standings, or null if nobody has scored. */
export function tournamentWinner(standings: Standing[], format: string): TournamentWinner | null {
  const [first, second] = standings;
  if (!first || first.holesPlayed === 0) return null;

  const label = (s: Standing) => (s.subName && isAmbroseFormat(format) ? `${s.name} (${s.subName})` : s.name);
  const detail = formatStandingScore(first.score, format);

  // A tie that countback couldn't split — share the win
  if (second && second.holesPlayed > 0 && second.score === first.score && !first.countbackLabel) {
    const tied = standings.filter((s) => s.holesPlayed > 0 && s.score === first.score);
    return { name: `${tied.map(label).join(" & ")} (tied)`, detail };
  }

  return { name: label(first), detail, countbackLabel: first.countbackLabel };
}
