"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  calcSkinsGroups,
  calcTournamentStandings,
  formatStandingScore,
  isAmbroseFormat,
  skinsGroupWinnerLabel,
  tournamentWinner,
  type SkinsGroupResult,
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
  // Skins: each group plays its own game, so results are per group rather than one ranking
  const [skinsGroups, setSkinsGroups] = useState<SkinsGroupResult[]>([]);
  const isSkins = format === "SKINS";
  const [loading, setLoading] = useState(true);

  async function fetchScores() {
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (!res.ok) return;
    const { tournament } = await res.json();
    if (isSkins) {
      setSkinsGroups(calcSkinsGroups(tournament.rounds ?? []));
    } else {
      // Countback only once the tournament is complete
      setEntries(calcTournamentStandings(tournament.rounds ?? [], format, !isActive));
    }
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

  if (isSkins) {
    return <SkinsGroupsBoard groups={skinsGroups} isActive={isActive} highlightRoundId={highlightRoundId} />;
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
            <Link
              href={`/tournaments/${tournamentId}/countback`}
              className="inline-block text-fairway-300 text-xs mt-1 underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              {winner.countbackLabel} · How was this decided? →
            </Link>
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

/** Skins event results: a card per group, plus a "Group winners" banner once the event is complete. */
function SkinsGroupsBoard({
  groups,
  isActive,
  highlightRoundId,
}: {
  groups: SkinsGroupResult[];
  isActive: boolean;
  highlightRoundId?: string;
}) {
  if (groups.length === 0 || groups.every((g) => g.holesDecided === 0)) {
    return <div className="text-sm text-gray-500">No skins decided yet.</div>;
  }

  return (
    <div className="space-y-3">
      {!isActive && (
        <div className="bg-fairway-900 text-white rounded-2xl p-5 text-center">
          <p className="text-fairway-300 text-xs uppercase tracking-widest mb-2">Group winners</p>
          <ul className="space-y-1">
            {groups.map((g) => (
              <li key={g.roundId}>
                <span className="text-fairway-300 text-sm">Group {g.groupNumber}: </span>
                <span className="font-bold">{skinsGroupWinnerLabel(g) ? `🏆 ${skinsGroupWinnerLabel(g)}` : "No skins won"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.map((g) => {
        const leaderSkins = g.winners.length > 0 ? g.totals[0].skins : null;
        return (
          <div
            key={g.roundId}
            className={`rounded-xl border overflow-hidden ${g.roundId === highlightRoundId ? "border-fairway-400" : "border-gray-200"}`}
          >
            <div className="bg-fairway-50 px-4 py-2 flex items-baseline justify-between">
              <h3 className="font-semibold text-fairway-800 text-sm">Group {g.groupNumber}</h3>
              <p className="text-xs text-gray-500">
                {g.holesDecided} hole{g.holesDecided !== 1 ? "s" : ""} decided
                {g.carried > 0 && ` · ${g.carried} carried`}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Player</th>
                  <th>Skins</th>
                </tr>
              </thead>
              <tbody>
                {g.totals.map((t) => {
                  const leading = leaderSkins !== null && t.skins === leaderSkins;
                  return (
                    <tr key={t.playerId} className="border-t border-gray-100">
                      <td className={`px-4 py-2 ${leading ? "font-semibold text-fairway-900" : "text-gray-800"}`}>
                        {leading && !isActive && "🏆 "}
                        {t.name}
                        {leading && isActive && <span className="ml-2 text-xs text-fairway-600 font-medium">leading</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-800">
                        {t.skins} skin{t.skins !== 1 ? "s" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
