"use client";

import { useEffect, useState } from "react";
import {
  calcTournamentStandings,
  formatStandingScore,
  isAmbroseFormat,
  tournamentWinner,
  type Standing,
} from "@/lib/tournamentStandings";

interface Props {
  tournamentId: string;
  format: string;
  isActive: boolean;
  /** Rows from this round (the viewer's group) are highlighted */
  highlightRoundId?: string;
}

export default function TournamentLeaderboard({ tournamentId, format, isActive, highlightRoundId }: Props) {
  const [entries, setEntries] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchScores() {
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) return;
    const { tournament } = await res.json();
    // Countback only once the tournament is complete
    setEntries(calcTournamentStandings(tournament.rounds ?? [], format, !isActive));
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

  const winner = isActive ? null : tournamentWinner(entries, format);

  return (
    <div className="space-y-3">
      {winner && (
        <div className="bg-fairway-900 text-white rounded-2xl p-5 text-center">
          <p className="text-fairway-300 text-xs uppercase tracking-widest mb-1">Winner</p>
          <p className="text-2xl font-bold">🏆 {winner.name}</p>
          <p className="text-fairway-300 text-sm mt-1">{winner.detail}</p>
          {winner.countbackLabel && (
            <p className="text-fairway-400 text-xs mt-1">{winner.countbackLabel}</p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fairway-50">
            <tr>
              <th className="text-left px-4 py-2 text-fairway-800 font-semibold w-8">#</th>
              <th className="text-left px-4 py-2 text-fairway-800 font-semibold">{isAmbroseFormat(format) ? "Team" : "Player"}</th>
              <th className="text-right px-4 py-2 text-fairway-800 font-semibold">{format === "STABLEFORD" ? "Points" : "Net"}</th>
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
                  {entry.holesPlayed > 0 ? formatStandingScore(entry.score, format) : "—"}
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
    </div>
  );
}
