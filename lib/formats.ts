/**
 * Golf game format calculators.
 * All functions are pure — no side effects, no DB access.
 */

import { applyCountback } from "./countback";

export interface HoleScore {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  strokes: number;
}

export interface PlayerRoundResult {
  playerId: string;
  name: string;
  playingHandicap: number;
  holes: HoleScore[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strokes received on a hole given playing handicap and stroke index.
 * A plus (negative) handicap gives strokes back, starting from the easiest holes (SI 18, 17, …),
 * so the result is negative there — net = gross − strokes adds them to the score.
 */
export function strokesOnHole(
  playingHandicap: number,
  strokeIndex: number
): number {
  if (playingHandicap === 0) return 0;
  const size = Math.abs(playingHandicap);
  const full = Math.floor(size / 18);
  const extra = size % 18;
  if (playingHandicap > 0) return full + (strokeIndex <= extra ? 1 : 0);
  return -(full + (strokeIndex > 18 - extra ? 1 : 0)) || 0; // avoid -0
}

/** Net strokes on a hole */
export function netStrokes(hole: HoleScore, playingHandicap: number): number {
  return hole.strokes - strokesOnHole(playingHandicap, hole.strokeIndex);
}

// ─── Strokeplay ─────────────────────────────────────────────────────────────

export interface StrokeplayResult {
  playerId: string;
  name: string;
  gross: number;
  net: number;
  toPar: number;
  countbackLabel?: string;
}

export function calcStrokeplay(players: PlayerRoundResult[]): StrokeplayResult[] {
  const allHoles = players[0]?.holes.map((h) => h.holeNumber) ?? [];

  const raw: StrokeplayResult[] = players.map((p) => {
    const gross = p.holes.reduce((sum, h) => sum + h.strokes, 0);
    const net = p.holes.reduce(
      (sum, h) => sum + netStrokes(h, p.playingHandicap),
      0
    );
    const totalPar = p.holes.reduce((sum, h) => sum + h.par, 0);
    return { playerId: p.playerId, name: p.name, gross, net, toPar: net - totalPar };
  });

  const sorted = raw.sort((a, b) => a.net - b.net);

  // Build per-player, per-hole net score map for countback
  const holeNetMap = new Map<string, Map<number, number>>();
  for (const p of players) {
    const holeMap = new Map<number, number>();
    for (const h of p.holes) {
      holeMap.set(h.holeNumber, netStrokes(h, p.playingHandicap));
    }
    holeNetMap.set(p.playerId, holeMap);
  }

  return applyCountback(sorted, holeNetMap, true, allHoles, (r) => r.net);
}

// ─── Stableford ──────────────────────────────────────────────────────────────

export interface StablefordHoleResult {
  holeNumber: number;
  points: number;
}

export interface StablefordResult {
  playerId: string;
  name: string;
  totalPoints: number;
  holes: StablefordHoleResult[];
  countbackLabel?: string;
}

/** Points: Double eagle=5, Eagle=4, Birdie=3, Par=2, Bogey=1, Double bogey+=0 */
export function stablefordPoints(
  netScore: number,
  par: number
): number {
  const diff = netScore - par;
  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

export function calcStableford(players: PlayerRoundResult[]): StablefordResult[] {
  const allHoles = players[0]?.holes.map((h) => h.holeNumber) ?? [];

  const raw: StablefordResult[] = players.map((p) => {
    // Holes without a score (strokes 0) earn nothing
    const holes: StablefordHoleResult[] = p.holes.map((h) => ({
      holeNumber: h.holeNumber,
      points: h.strokes > 0 ? stablefordPoints(netStrokes(h, p.playingHandicap), h.par) : 0,
    }));
    return {
      playerId: p.playerId,
      name: p.name,
      totalPoints: holes.reduce((sum, h) => sum + h.points, 0),
      holes,
    };
  });

  const sorted = raw.sort((a, b) => b.totalPoints - a.totalPoints);

  // Build per-player, per-hole points map for countback
  const holePointsMap = new Map<string, Map<number, number>>();
  for (const r of sorted) {
    const holeMap = new Map<number, number>();
    for (const h of r.holes) {
      holeMap.set(h.holeNumber, h.points);
    }
    holePointsMap.set(r.playerId, holeMap);
  }

  return applyCountback(sorted, holePointsMap, false, allHoles, (r) => r.totalPoints);
}

// ─── Match Play (2 players) ───────────────────────────────────────────────────

/**
 * Match Play handicap allowance: the higher handicap receives the difference between the two
 * playing handicaps (on the lowest stroke indexes); the lower handicap plays off scratch.
 * Returns [player 1's strokes, player 2's strokes].
 */
export function matchPlayAllowances(playingHandicap1: number, playingHandicap2: number): [number, number] {
  const diff = playingHandicap1 - playingHandicap2;
  return diff > 0 ? [diff, 0] : [0, -diff || 0]; // avoid -0 when level
}

export type HoleResult = "player1" | "player2" | "halved";

export interface MatchPlayResult {
  holes: { holeNumber: number; result: HoleResult }[];
  status: string;
  winner: string | null;
  /** True once the match is decided or every hole has been played */
  finished: boolean;
}

/**
 * Net match play between two players over `totalHoles` holes (9 or 18), using the handicap
 * difference (matchPlayAllowances). Holes where either player has no score yet (strokes 0) are
 * not counted, and nothing after the hole the match was decided on counts (e.g. won 3&2).
 */
export function calcMatchPlay(
  p1: PlayerRoundResult,
  p2: PlayerRoundResult,
  totalHoles: number
): MatchPlayResult {
  let p1Holes = 0;
  let p2Holes = 0;
  const holes: MatchPlayResult["holes"] = [];
  const [allowance1, allowance2] = matchPlayAllowances(p1.playingHandicap, p2.playingHandicap);

  for (const h1 of [...p1.holes].sort((a, b) => a.holeNumber - b.holeNumber)) {
    // The match is over once the lead is bigger than the holes left
    if (Math.abs(p1Holes - p2Holes) > totalHoles - holes.length) break;
    const h2 = p2.holes.find((h) => h.holeNumber === h1.holeNumber);
    if (!h2 || h1.strokes <= 0 || h2.strokes <= 0) continue;

    const net1 = netStrokes(h1, allowance1);
    const net2 = netStrokes(h2, allowance2);

    let result: HoleResult;
    if (net1 < net2) {
      result = "player1";
      p1Holes++;
    } else if (net2 < net1) {
      result = "player2";
      p2Holes++;
    } else {
      result = "halved";
    }
    holes.push({ holeNumber: h1.holeNumber, result });
  }

  const diff = p1Holes - p2Holes;
  const holesRemaining = Math.max(0, totalHoles - holes.length);
  const finished = Math.abs(diff) > holesRemaining || holesRemaining === 0;
  const leader = diff > 0 ? p1.name : diff < 0 ? p2.name : null;

  let status: string;
  if (diff === 0) {
    status = finished ? "Match halved" : "All Square";
  } else if (finished) {
    status = `${leader} wins ${Math.abs(diff)}${holesRemaining > 0 ? `&${holesRemaining}` : " up"}`;
  } else {
    status = `${leader} ${Math.abs(diff)} UP`;
  }

  return { holes, status, winner: finished ? leader : null, finished };
}

// ─── Skins ────────────────────────────────────────────────────────────────────

export interface SkinResult {
  holeNumber: number;
  /** playerId of the skin winner */
  winnerId: string | null;
  winner: string | null;
  carried: boolean;
  value: number;
}

export interface SkinsResults {
  skins: SkinResult[];
  totals: { playerId: string; name: string; skins: number }[];
}

/**
 * Skins: the lowest net score on a hole wins its skin outright.
 * With `carryOver` (the default) a halved hole's skin rolls on to the next hole;
 * without it, a halved hole's skin is simply lost and every skin is worth 1.
 */
export function calcSkins(
  players: PlayerRoundResult[],
  { carryOver = true }: { carryOver?: boolean } = {}
): SkinsResults {
  const skins: SkinResult[] = [];
  let carryover = 0;

  const holeNumbers = players[0]?.holes.map((h) => h.holeNumber) ?? [];

  for (const holeNum of holeNumbers) {
    const holeScores = players.flatMap((p) => {
      const hole = p.holes.find((h) => h.holeNumber === holeNum);
      if (!hole || hole.strokes <= 0) return [];
      return [{ playerId: p.playerId, name: p.name, net: netStrokes(hole, p.playingHandicap) }];
    });
    // A hole isn't decided until everyone has a score on it
    if (holeScores.length < players.length) continue;

    const minScore = Math.min(...holeScores.map((s) => s.net));
    const winners = holeScores.filter((s) => s.net === minScore);

    if (winners.length === 1) {
      const value = 1 + carryover;
      skins.push({ holeNumber: holeNum, winnerId: winners[0].playerId, winner: winners[0].name, carried: carryover > 0, value });
      carryover = 0;
    } else {
      skins.push({ holeNumber: holeNum, winnerId: null, winner: null, carried: false, value: 0 });
      if (carryOver) carryover++;
    }
  }

  const totals = players.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    skins: skins.filter((s) => s.winnerId === p.playerId).reduce((sum, s) => sum + s.value, 0),
  }));

  return { skins, totals };
}

// ─── Ambrose (2-player and 4-player) ─────────────────────────────────────────

export interface AmbroseTeam {
  teamId: string;
  name: string;
  players: PlayerRoundResult[];
  /** Best-ball score per hole, with strokeIndex for per-hole handicap application */
  teamHoles: { holeNumber: number; par: number; strokeIndex: number; strokes: number }[];
}

export interface AmbroseResult {
  teamId: string;
  playerId: string; // alias for teamId, satisfies applyCountback constraint
  name: string;
  teamHandicap: number;
  gross: number;
  net: number;
  toPar: number;
  countbackLabel?: string;
}

/**
 * Ambrose team handicap = sum of the team's handicaps ÷ (2 × players in the team), rounded.
 * Uses the team's actual size, so short teams are handled fairly:
 *  pair ÷4, three ÷6, four ÷8, a player on their own ÷2.
 */
export function ambroseTeamHandicap(handicaps: number[]): number {
  if (handicaps.length === 0) return 0;
  const sum = handicaps.reduce((a, b) => a + b, 0);
  return Math.round(sum / (2 * handicaps.length));
}

export function calcAmbrose(teams: AmbroseTeam[]): AmbroseResult[] {
  const allHoles = teams[0]?.teamHoles.map((h) => h.holeNumber) ?? [];

  const raw: AmbroseResult[] = teams.map((team) => {
    const handicaps = team.players.map((p) => p.playingHandicap);
    const teamHandicap = ambroseTeamHandicap(handicaps);
    const gross = team.teamHoles.reduce((sum, h) => sum + h.strokes, 0);
    // Per-hole handicap application (same WHS stroke-index distribution as individual)
    const net = team.teamHoles.reduce(
      (sum, h) => sum + (h.strokes - strokesOnHole(teamHandicap, h.strokeIndex)),
      0
    );
    const totalPar = team.teamHoles.reduce((sum, h) => sum + h.par, 0);
    return {
      teamId: team.teamId,
      // playerId alias so applyCountback can key on it
      playerId: team.teamId,
      name: team.name,
      teamHandicap,
      gross,
      net,
      toPar: net - totalPar,
    };
  });

  const sorted = raw.sort((a, b) => a.net - b.net);

  // Build per-team, per-hole net map for countback
  const holeNetMap = new Map<string, Map<number, number>>();
  for (const team of teams) {
    const handicaps = team.players.map((p) => p.playingHandicap);
    const teamHandicap = ambroseTeamHandicap(handicaps);
    const holeMap = new Map<number, number>();
    for (const h of team.teamHoles) {
      holeMap.set(h.holeNumber, h.strokes - strokesOnHole(teamHandicap, h.strokeIndex));
    }
    holeNetMap.set(team.teamId, holeMap);
  }

  return applyCountback(sorted, holeNetMap, true, allHoles, (r) => r.net);
}

// ─── 2-ball / 4-ball Stableford (scramble, like Ambrose) ─────────────────────

export interface StablefordTeamResult {
  teamId: string;
  playerId: string; // alias for teamId, satisfies applyCountback constraint
  name: string;
  teamHandicap: number;
  totalPoints: number;
  countbackLabel?: string;
}

/**
 * 2-ball / 4-ball Stableford, played as a scramble like Ambrose: everyone hits, the team plays on from
 * the best shot and records one score per hole. The team handicap is worked out
 * the Ambrose way (sum ÷ 2 × players), and the team scores Stableford points on its net score.
 * Holes without a team score (strokes 0) earn nothing. Countback on points, higher is better.
 */
export function calcStablefordTeams(teams: AmbroseTeam[]): StablefordTeamResult[] {
  const allHoles = teams[0]?.teamHoles.map((h) => h.holeNumber) ?? [];
  const holePoints = new Map<string, Map<number, number>>();

  const raw: StablefordTeamResult[] = teams.map((team) => {
    const teamHandicap = ambroseTeamHandicap(team.players.map((p) => p.playingHandicap));
    const points = new Map<number, number>();
    for (const h of team.teamHoles) {
      if (h.strokes <= 0) continue;
      points.set(h.holeNumber, stablefordPoints(h.strokes - strokesOnHole(teamHandicap, h.strokeIndex), h.par));
    }
    holePoints.set(team.teamId, points);
    return {
      teamId: team.teamId,
      playerId: team.teamId,
      name: team.name,
      teamHandicap,
      totalPoints: [...points.values()].reduce((a, b) => a + b, 0),
    };
  });

  const sorted = raw.sort((a, b) => b.totalPoints - a.totalPoints);
  return applyCountback(sorted, holePoints, false, allHoles, (r) => r.totalPoints);
}
