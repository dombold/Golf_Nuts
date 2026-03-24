"use client";

import { useEffect, useState } from "react";

interface PlayerEntry {
  id: string;
  name: string;
  roundId: string;
  groupNumber: number;
  teamNumber?: number | null;
  totalStrokes: number;
  holesPlayed: number;
}

interface Props {
  tournamentId: string;
  format: string;
  isActive: boolean;
}

const isAmbrose = (f: string) => f === "AMBROSE_2" || f === "AMBROSE_4";

export default function TournamentLeaderboard({ tournamentId, format, isActive }: Props) {
  const [entries, setEntries] = useState<PlayerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchScores() {
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) return;
    const { tournament } = await res.json();

    const allEntries: PlayerEntry[] = [];

    for (const tr of tournament.rounds ?? []) {
      const round = tr.round;
      if (!round) continue;

      for (const rp of round.players ?? []) {
        // Fetch scores for this round player by getting round detail
        // We use the data already included in the round player scores if available
        allEntries.push({
          id: rp.user.id,
          name: rp.user.name,
          roundId: round.id,
          groupNumber: tr.roundNumber,
          teamNumber: rp.teamNumber ?? null,
          totalStrokes: rp.scores?.reduce((s: number, sc: { strokes: number }) => s + sc.strokes, 0) ?? 0,
          holesPlayed: rp.scores?.length ?? 0,
        });
      }
    }

    setEntries(allEntries);
    setLoading(false);
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

  // For Ambrose: group by round + teamNumber
  if (isAmbrose(format)) {
    const teams: Record<string, { label: string; strokes: number; holes: number }> = {};
    for (const e of entries) {
      const key = `${e.roundId}-${e.teamNumber ?? 0}`;
      if (!teams[key]) {
        teams[key] = {
          label: `Group ${e.groupNumber}${e.teamNumber ? ` · Team ${e.teamNumber}` : ""}`,
          strokes: e.totalStrokes,
          holes: e.holesPlayed,
        };
      }
    }

    const sorted = Object.values(teams).sort((a, b) => a.strokes - b.strokes);

    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fairway-50">
            <tr>
              <th className="text-left px-4 py-2 text-fairway-800 font-semibold">Team</th>
              <th className="text-right px-4 py-2 text-fairway-800 font-semibold">Strokes</th>
              <th className="text-right px-4 py-2 text-fairway-800 font-semibold">Holes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-2.5 text-gray-800">{team.label}</td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-800">{team.strokes}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">{team.holes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Individual formats: sort by strokes
  const sorted = [...entries].sort((a, b) => {
    if (b.holesPlayed !== a.holesPlayed) return b.holesPlayed - a.holesPlayed;
    return a.totalStrokes - b.totalStrokes;
  });

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-fairway-50">
          <tr>
            <th className="text-left px-4 py-2 text-fairway-800 font-semibold w-8">#</th>
            <th className="text-left px-4 py-2 text-fairway-800 font-semibold">Player</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold">Strokes</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold hidden sm:table-cell">Holes</th>
            <th className="text-right px-4 py-2 text-fairway-800 font-semibold hidden sm:table-cell">Group</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => (
            <tr key={entry.id} className="border-t border-gray-100">
              <td className="px-4 py-2.5 text-gray-400 font-mono">{i + 1}</td>
              <td className="px-4 py-2.5 text-gray-800">{entry.name}</td>
              <td className="px-4 py-2.5 text-right font-mono text-gray-800">
                {entry.holesPlayed > 0 ? entry.totalStrokes : "—"}
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
