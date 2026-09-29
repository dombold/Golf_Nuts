"use client";

import { useEffect, useState } from "react";
import { strokesOnHole, stablefordPoints, ambroseTeamHandicap } from "@/lib/formats";
import { applyCountback } from "@/lib/countback";

interface HoleInfo {
  number: number;
  strokeIndex: number;
  par: number;
}

interface PlayerScore {
  holeNumber: number;
  strokes: number;
}

interface RoundPlayer {
  id: string;
  playingHandicap: number;
  teamNumber: number | null;
  user: { id: string; name: string };
  scores: PlayerScore[];
}

interface RoundData {
  id: string;
  status: string;
  tee?: { holes: HoleInfo[] };
  players: RoundPlayer[];
}

interface TournamentRound {
  roundNumber: number;
  round: RoundData;
}

interface LeaderEntry {
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

interface Props {
  tournamentId: string;
  format: string;
  isActive: boolean;
  /** Rows from this round (the viewer's group) are highlighted */
  highlightRoundId?: string;
}

const isAmbrose = (f: string) => f === "AMBROSE_2" || f === "AMBROSE_4";

function firstName(name: string) {
  return name.split(" ")[0];
}

function formatScore(score: number, stableford: boolean) {
  if (stableford) return `${score} pts`;
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

/** Sum of per-hole values, keyed by hole number */
function total(holeValues: Map<number, number>) {
  let sum = 0;
  for (const v of holeValues.values()) sum += v;
  return sum;
}

export default function TournamentLeaderboard({ tournamentId, format, isActive, highlightRoundId }: Props) {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const stableford = format === "STABLEFORD";

  async function fetchScores() {
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) return;
    const { tournament } = await res.json();
    setEntries(buildEntries(tournament.rounds ?? []));
    setLoading(false);
  }

  function buildEntries(rounds: TournamentRound[]): LeaderEntry[] {
    const all: LeaderEntry[] = [];
    // Per-entry, per-hole values (points or net-to-par) for totals and countback
    const holeValues = new Map<string, Map<number, number>>();

    for (const tr of rounds) {
      const round = tr.round;
      if (!round) continue;
      const holeInfos = new Map((round.tee?.holes ?? []).map((h) => [h.number, h]));

      if (isAmbrose(format)) {
        // One entry per team within each group: best ball per hole, team handicap
        const teams = new Map<number, RoundPlayer[]>();
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

    // Countback only once the tournament is complete
    if (isActive || sorted.length === 0) return sorted;

    const allHoles = Array.from(holeValues.get(sorted[0].playerId)?.keys() ?? []).sort((a, b) => a - b);
    return applyCountback(sorted, holeValues, !stableford, allHoles, (e) => e.score);
  }

  useEffect(() => {
    fetchScores();
    if (!isActive) return;
    const interval = setInterval(fetchScores, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, isActive]);

  if (loading) {
    return <div className="text-sm text-gray-500 animate-pulse">Loading leaderboard…</div>;
  }

  if (entries.length === 0) {
    return <div className="text-sm text-gray-500">No scores yet.</div>;
  }

  const ambrose = isAmbrose(format);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-fairway-50">
          <tr>
            <th className="text-left px-4 py-2 text-fairway-800 font-semibold w-8">#</th>
            <th className="text-left px-4 py-2 text-fairway-800 font-semibold">{ambrose ? "Team" : "Player"}</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold">{stableford ? "Points" : "Net"}</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold">Thru</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold hidden sm:table-cell">Group</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={entry.playerId}
              className={`border-t border-gray-100 ${entry.roundId === highlightRoundId ? "bg-fairway-50" : ""}`}
            >
              <td className="px-4 py-2.5 text-gray-400 font-mono">{i + 1}</td>
              <td className="px-4 py-2.5 text-gray-800">
                {entry.name}
                {entry.countbackLabel && (
                  <span className="ml-2 text-xs text-fairway-600 font-medium">(CB)</span>
                )}
                {entry.subName && (
                  <span className="block text-xs text-gray-400">{entry.subName}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-gray-800">
                {entry.holesPlayed > 0 ? formatScore(entry.score, stableford) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-500">
                {entry.holesPlayed}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
                {entry.groupNumber}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
