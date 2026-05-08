"use client";

import { useEffect, useState } from "react";
import { strokesOnHole, ambroseTeamHandicap } from "@/lib/formats";
import { applyCountback } from "@/lib/countback";

interface HoleInfo {
  number: number;
  strokeIndex: number;
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
  playerId: string;
  name: string;
  roundId: string;
  groupNumber: number;
  teamNumber: number | null;
  net: number;
  holesPlayed: number;
  countbackLabel?: string;
}

interface TeamEntry {
  playerId: string; // key for applyCountback
  label: string;
  net: number;
  holes: number;
  countbackLabel?: string;
}

interface Props {
  tournamentId: string;
  format: string;
  isActive: boolean;
}

const isAmbrose = (f: string) => f === "AMBROSE_2" || f === "AMBROSE_4";

function calcNetForPlayer(
  player: RoundPlayer,
  holeInfos: HoleInfo[]
): number {
  return player.scores.reduce((sum, sc) => {
    const hole = holeInfos.find((h) => h.number === sc.holeNumber);
    if (!hole) return sum + sc.strokes;
    return sum + sc.strokes - strokesOnHole(player.playingHandicap, hole.strokeIndex);
  }, 0);
}

export default function TournamentLeaderboard({ tournamentId, format, isActive }: Props) {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [teamEntries, setTeamEntries] = useState<TeamEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchScores() {
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) return;
    const { tournament } = await res.json();

    if (isAmbrose(format)) {
      buildAmbroseEntries(tournament.rounds ?? [], format);
    } else {
      buildIndividualEntries(tournament.rounds ?? []);
    }
    setLoading(false);
  }

  function buildIndividualEntries(rounds: TournamentRound[]) {
    const all: LeaderEntry[] = [];

    for (const tr of rounds) {
      const round = tr.round;
      if (!round) continue;
      const holeInfos: HoleInfo[] = round.tee?.holes ?? [];

      for (const rp of round.players ?? []) {
        const net = calcNetForPlayer(rp, holeInfos);
        all.push({
          playerId: rp.user.id,
          name: rp.user.name,
          roundId: round.id,
          groupNumber: tr.roundNumber,
          teamNumber: rp.teamNumber ?? null,
          net,
          holesPlayed: rp.scores.length,
        });
      }
    }

    // Only apply countback when round is complete (isActive === false)
    if (!isActive && all.length > 0) {
      const sorted = [...all].sort((a, b) => {
        if (b.holesPlayed !== a.holesPlayed) return b.holesPlayed - a.holesPlayed;
        return a.net - b.net;
      });

      // Build per-player, per-hole net map from the raw data
      const holeNetMap = new Map<string, Map<number, number>>();
      for (const tr of rounds) {
        const holeInfos: HoleInfo[] = tr.round?.tee?.holes ?? [];
        for (const rp of tr.round?.players ?? []) {
          const holeMap = new Map<number, number>();
          for (const sc of rp.scores) {
            const hole = holeInfos.find((h) => h.number === sc.holeNumber);
            const net = hole
              ? sc.strokes - strokesOnHole(rp.playingHandicap, hole.strokeIndex)
              : sc.strokes;
            holeMap.set(sc.holeNumber, net);
          }
          holeNetMap.set(rp.user.id, holeMap);
        }
      }

      const allHoles = sorted[0]
        ? Array.from(holeNetMap.get(sorted[0].playerId)?.keys() ?? []).sort((a, b) => a - b)
        : [];

      const withCB = applyCountback(sorted, holeNetMap, true, allHoles, (e) => e.net);
      setEntries(withCB);
    } else {
      const sorted = [...all].sort((a, b) => {
        if (b.holesPlayed !== a.holesPlayed) return b.holesPlayed - a.holesPlayed;
        return a.net - b.net;
      });
      setEntries(sorted);
    }
  }

  function buildAmbroseEntries(rounds: TournamentRound[], fmt: string) {
    const teamSize = fmt === "AMBROSE_2" ? 2 : 4;
    // Map: `${roundId}-${teamNumber}` → accumulated player data
    const teamMap = new Map<string, {
      label: string;
      players: RoundPlayer[];
      holeInfos: HoleInfo[];
    }>();

    for (const tr of rounds) {
      const round = tr.round;
      if (!round) continue;
      const holeInfos: HoleInfo[] = round.tee?.holes ?? [];

      for (const rp of round.players ?? []) {
        const key = `${round.id}-${rp.teamNumber ?? 0}`;
        if (!teamMap.has(key)) {
          teamMap.set(key, {
            label: `Group ${tr.roundNumber}${rp.teamNumber ? ` · Team ${rp.teamNumber}` : ""}`,
            players: [],
            holeInfos,
          });
        }
        teamMap.get(key)!.players.push(rp);
      }
    }

    const rawTeams: TeamEntry[] = [];

    for (const [key, { label, players, holeInfos }] of teamMap) {
      const handicaps = players.map((p) => p.playingHandicap);
      const teamHandicap = ambroseTeamHandicap(
        handicaps,
        teamSize as 2 | 4
      );

      // Best-ball per hole
      const holeNumbers = [...new Set(players.flatMap((p) => p.scores.map((s) => s.holeNumber)))].sort((a, b) => a - b);
      let net = 0;
      for (const holeNum of holeNumbers) {
        const bestBall = Math.min(
          ...players.map((p) => {
            const sc = p.scores.find((s) => s.holeNumber === holeNum);
            return sc?.strokes ?? Infinity;
          })
        );
        if (bestBall === Infinity) continue;
        const hole = holeInfos.find((h) => h.number === holeNum);
        net += hole
          ? bestBall - strokesOnHole(teamHandicap, hole.strokeIndex)
          : bestBall;
      }

      rawTeams.push({
        playerId: key,
        label,
        net,
        holes: holeNumbers.length,
      });
    }

    const sorted = [...rawTeams].sort((a, b) => {
      if (b.holes !== a.holes) return b.holes - a.holes;
      return a.net - b.net;
    });

    if (!isActive && sorted.length > 0) {
      // Build per-team, per-hole net map for countback
      const holeNetMap = new Map<string, Map<number, number>>();
      for (const [key, { players, holeInfos }] of teamMap) {
        const handicaps = players.map((p) => p.playingHandicap);
        const teamHandicap = ambroseTeamHandicap(handicaps, teamSize as 2 | 4);
        const holeNumbers = [...new Set(players.flatMap((p) => p.scores.map((s) => s.holeNumber)))].sort((a, b) => a - b);
        const holeMap = new Map<number, number>();
        for (const holeNum of holeNumbers) {
          const bestBall = Math.min(
            ...players.map((p) => {
              const sc = p.scores.find((s) => s.holeNumber === holeNum);
              return sc?.strokes ?? Infinity;
            })
          );
          if (bestBall === Infinity) continue;
          const hole = holeInfos.find((h) => h.number === holeNum);
          holeMap.set(
            holeNum,
            hole ? bestBall - strokesOnHole(teamHandicap, hole.strokeIndex) : bestBall
          );
        }
        holeNetMap.set(key, holeMap);
      }

      const allHoles = sorted[0]
        ? Array.from(holeNetMap.get(sorted[0].playerId)?.keys() ?? []).sort((a, b) => a - b)
        : [];

      const withCB = applyCountback(sorted, holeNetMap, true, allHoles, (e) => e.net);
      setTeamEntries(withCB);
    } else {
      setTeamEntries(sorted);
    }
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

  // ── Ambrose ─────────────────────────────────────────────────────────────────
  if (isAmbrose(format)) {
    if (teamEntries.length === 0) {
      return <div className="text-sm text-gray-500">No scores yet.</div>;
    }

    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fairway-50">
            <tr>
              <th className="text-left px-4 py-2 text-fairway-800 font-semibold w-8">#</th>
              <th className="text-left px-4 py-2 text-fairway-800 font-semibold">Team</th>
              <th className="text-right px-4 py-2 text-fairway-800 font-semibold">Net</th>
              <th className="text-right px-4 py-2 text-fairway-800 font-semibold hidden sm:table-cell">Holes</th>
            </tr>
          </thead>
          <tbody>
            {teamEntries.map((team, i) => (
              <tr key={team.playerId} className="border-t border-gray-100">
                <td className="px-4 py-2.5 text-gray-400 font-mono">{i + 1}</td>
                <td className="px-4 py-2.5 text-gray-800">
                  {team.label}
                  {team.countbackLabel && (
                    <span className="ml-2 text-xs text-fairway-600 font-medium">(CB)</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-800">
                  {team.holes > 0 ? team.net : "—"}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
                  {team.holes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Individual formats ───────────────────────────────────────────────────────
  if (entries.length === 0) {
    return <div className="text-sm text-gray-500">No scores yet.</div>;
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-fairway-50">
          <tr>
            <th className="text-left px-4 py-2 text-fairway-800 font-semibold w-8">#</th>
            <th className="text-left px-4 py-2 text-fairway-800 font-semibold">Player</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold">Net</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold hidden sm:table-cell">Holes</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold hidden sm:table-cell">Group</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={entry.playerId} className="border-t border-gray-100">
              <td className="px-4 py-2.5 text-gray-400 font-mono">{i + 1}</td>
              <td className="px-4 py-2.5 text-gray-800">
                {entry.name}
                {entry.countbackLabel && (
                  <span className="ml-2 text-xs text-fairway-600 font-medium">(CB)</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-gray-800">
                {entry.holesPlayed > 0 ? entry.net : "—"}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
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
