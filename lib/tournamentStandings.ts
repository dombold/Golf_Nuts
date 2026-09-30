/**
 * Tournament-wide standings across every group's round.
 * Pure functions — shared by the live leaderboard (client) and server-rendered results.
 */

import { strokesOnHole, stablefordPoints, ambroseTeamHandicap, calcSkins } from "./formats";
import { applyCountback, traceCountback, type CountbackTrace } from "./countback";
import { isHoleInPlay } from "./nines";

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
    /** Which holes are in play (defaults to all 18 from hole 1) */
    holesCount?: number;
    startingHole?: number;
    /** Skins: whether a halved hole's skin rolls on (defaults to true) */
    skinsCarryOver?: boolean;
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

// ─── Skins events: each group plays its own skins game ─────────────────────

export interface SkinsGroupResult {
  groupNumber: number;
  roundId: string;
  /** Every player in the group, most skins first */
  totals: { playerId: string; name: string; skins: number }[];
  /** Names of the leader(s) — more than one when tied; empty until someone wins a skin */
  winners: string[];
  /** Holes everyone in the group has scored */
  holesDecided: number;
  /** Whether halved holes carry over in this group's game */
  carryOver: boolean;
  /** Carry-over on: skins riding on unwon holes at the end of the holes decided so far.
   *  Carry-over off: how many holes were halved (their skins are lost). */
  carried: number;
}

/** Skins results per group, in group order. A hole counts once everyone in the group has scored it. */
export function calcSkinsGroups(rounds: StandingsRound[]): SkinsGroupResult[] {
  return rounds
    .filter((tr): tr is StandingsRound & { round: NonNullable<StandingsRound["round"]> } => !!tr.round)
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map(({ roundNumber, round }) => {
      const carryOver = round.skinsCarryOver ?? true;
      const holes = (round.tee?.holes ?? [])
        .filter((h) => isHoleInPlay(h.number, round.holesCount ?? 18, round.startingHole ?? 1))
        .sort((a, b) => a.number - b.number);

      const { skins, totals } = calcSkins(
        round.players.map((p) => ({
          playerId: p.user.id,
          name: p.user.name,
          playingHandicap: p.playingHandicap,
          holes: holes.map((h) => ({
            holeNumber: h.number,
            par: h.par,
            strokeIndex: h.strokeIndex,
            strokes: p.scores.find((s) => s.holeNumber === h.number)?.strokes ?? 0,
          })),
        })),
        { carryOver }
      );

      const sorted = [...totals].sort((a, b) => b.skins - a.skins || a.name.localeCompare(b.name));
      const top = sorted[0]?.skins ?? 0;
      let carried = 0;
      if (carryOver) {
        for (let i = skins.length - 1; i >= 0 && skins[i].winnerId === null; i--) carried++;
      } else {
        carried = skins.filter((s) => s.winnerId === null).length;
      }

      return {
        groupNumber: roundNumber,
        roundId: round.id,
        totals: sorted,
        winners: top > 0 ? sorted.filter((t) => t.skins === top).map((t) => t.name) : [],
        holesDecided: skins.length,
        carryOver,
        carried,
      };
    });
}

/** "Alice Green · 4 skins", "Alice & Bob (tied) · 3 skins each", or null if nobody has won a skin. */
export function skinsGroupWinnerLabel(group: Pick<SkinsGroupResult, "winners" | "totals">): string | null {
  if (group.winners.length === 0) return null;
  const skins = group.totals[0].skins;
  const plural = `skin${skins !== 1 ? "s" : ""}`;
  if (group.winners.length === 1) return `${group.winners[0]} · ${skins} ${plural}`;
  const names = group.winners.map(firstName);
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]} (tied) · ${skins} ${plural} each`;
}
