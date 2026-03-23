/**
 * Golf game format calculators.
 * All functions are pure — no side effects, no DB access.
 */

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

/** Strokes received on a hole given playing handicap and stroke index */
export function strokesOnHole(
  playingHandicap: number,
  strokeIndex: number
): number {
  if (playingHandicap <= 0) return 0;
  const full = Math.floor(playingHandicap / 18);
  const extra = playingHandicap % 18;
  return full + (strokeIndex <= extra ? 1 : 0);
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
}

export function calcStrokeplay(players: PlayerRoundResult[]): StrokeplayResult[] {
  return players
    .map((p) => {
      const gross = p.holes.reduce((sum, h) => sum + h.strokes, 0);
      const net = p.holes.reduce(
        (sum, h) => sum + netStrokes(h, p.playingHandicap),
        0
      );
      const totalPar = p.holes.reduce((sum, h) => sum + h.par, 0);
      return {
        playerId: p.playerId,
        name: p.name,
        gross,
        net,
        toPar: net - totalPar,
      };
    })
    .sort((a, b) => a.net - b.net);
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
  return players
    .map((p) => {
      const holes: StablefordHoleResult[] = p.holes.map((h) => ({
        holeNumber: h.holeNumber,
        points: stablefordPoints(
          netStrokes(h, p.playingHandicap),
          h.par
        ),
      }));
      return {
        playerId: p.playerId,
        name: p.name,
        totalPoints: holes.reduce((sum, h) => sum + h.points, 0),
        holes,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

// ─── Match Play (2 players) ───────────────────────────────────────────────────

export type HoleResult = "player1" | "player2" | "halved";

export interface MatchPlayResult {
  holes: { holeNumber: number; result: HoleResult }[];
  status: string;
  winner: string | null;
}

export function calcMatchPlay(
  p1: PlayerRoundResult,
  p2: PlayerRoundResult
): MatchPlayResult {
  let p1Holes = 0;
  let p2Holes = 0;
  const holes: MatchPlayResult["holes"] = [];

  for (const h1 of p1.holes) {
    const h2 = p2.holes.find((h) => h.holeNumber === h1.holeNumber);
    if (!h2) continue;

    const net1 = netStrokes(h1, p1.playingHandicap);
    const net2 = netStrokes(h2, p2.playingHandicap);

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
  const holesPlayed = holes.length;
  const holesRemaining = 18 - holesPlayed;

  let status: string;
  let winner: string | null = null;

  if (diff > holesRemaining || holesPlayed === 18) {
    winner = diff > 0 ? p1.name : diff < 0 ? p2.name : null;
    status =
      diff === 0
        ? "All Square"
        : `${winner} wins ${Math.abs(diff)}${holesPlayed < 18 ? "&" + holesRemaining : ""}`;
  } else {
    status =
      diff === 0 ? "All Square" : `${diff > 0 ? p1.name : p2.name} ${Math.abs(diff)} UP`;
  }

  return { holes, status, winner };
}

// ─── Skins ────────────────────────────────────────────────────────────────────

export interface SkinResult {
  holeNumber: number;
  winner: string | null;
  carried: boolean;
  value: number;
}

export interface SkinsResults {
  skins: SkinResult[];
  totals: { playerId: string; name: string; skins: number }[];
}

export function calcSkins(players: PlayerRoundResult[]): SkinsResults {
  const skins: SkinResult[] = [];
  let carryover = 0;

  const holeNumbers = players[0]?.holes.map((h) => h.holeNumber) ?? [];

  for (const holeNum of holeNumbers) {
    const holeScores = players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      net: netStrokes(
        p.holes.find((h) => h.holeNumber === holeNum)!,
        p.playingHandicap
      ),
    }));

    const minScore = Math.min(...holeScores.map((s) => s.net));
    const winners = holeScores.filter((s) => s.net === minScore);

    if (winners.length === 1) {
      const value = 1 + carryover;
      skins.push({ holeNumber: holeNum, winner: winners[0].name, carried: carryover > 0, value });
      carryover = 0;
    } else {
      skins.push({ holeNumber: holeNum, winner: null, carried: false, value: 0 });
      carryover++;
    }
  }

  const totals = players.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    skins: skins.filter((s) => s.winner === p.name).reduce((sum, s) => sum + s.value, 0),
  }));

  return { skins, totals };
}

// ─── Ambrose (2-player and 4-player) ─────────────────────────────────────────

export interface AmbroseTeam {
  teamId: string;
  name: string;
  players: PlayerRoundResult[];
  /** Scores submitted as team best-ball per hole */
  teamHoles: { holeNumber: number; par: number; strokes: number }[];
}

export interface AmbroseResult {
  teamId: string;
  name: string;
  teamHandicap: number;
  gross: number;
  net: number;
  toPar: number;
}

/**
 * Ambrose team handicap:
 *  2-player: (H1 + H2) / 4
 *  4-player: (H1 + H2 + H3 + H4) / 8
 */
export function ambroseTeamHandicap(
  handicaps: number[],
  teamSize: 2 | 4
): number {
  const sum = handicaps.reduce((a, b) => a + b, 0);
  return Math.round(sum / (teamSize * 2));
}

export function calcAmbrose(teams: AmbroseTeam[], teamSize: 2 | 4): AmbroseResult[] {
  return teams
    .map((team) => {
      const handicaps = team.players.map((p) => p.playingHandicap);
      const teamHandicap = ambroseTeamHandicap(handicaps, teamSize);
      const gross = team.teamHoles.reduce((sum, h) => sum + h.strokes, 0);
      const net = gross - teamHandicap;
      const totalPar = team.teamHoles.reduce((sum, h) => sum + h.par, 0);
      return {
        teamId: team.teamId,
        name: team.name,
        teamHandicap,
        gross,
        net,
        toPar: net - totalPar,
      };
    })
    .sort((a, b) => a.net - b.net);
}
