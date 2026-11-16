"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import { ambroseTeamHandicap } from "@/lib/formats";
import { joinNames, strandedPartnerMove } from "@/lib/teams";

interface GroupPlayer {
  userId: string;
  name: string;
  teamNumber: number | null;
  playingHandicap: number;
}

/**
 * Organiser's late-withdrawal control for one live event group. Removes the player and their
 * scores; in a team game, a partner left on their own joins another team in the group
 * (a 2-ball group of four becomes one 3-ball team). Other groups are unaffected.
 */
export default function WithdrawPlayerButton({
  roundId,
  groupNumber,
  players,
  teamGame,
}: {
  roundId: string;
  groupNumber: number;
  players: GroupPlayer[];
  teamGame: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [merge, setMerge] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const first = (name: string) => name.split(" ")[0];
  const withdrawn = players.find((p) => p.userId === userId);
  const move = teamGame && withdrawn ? strandedPartnerMove(players, userId) : null;
  const mergedTeam = move
    ? players.filter((p) => p.userId !== userId && (p.userId === move.userId || (p.teamNumber ?? 0) === move.toTeam))
    : [];
  const mover = move ? players.find((p) => p.userId === move.userId) : undefined;

  async function confirm() {
    if (!withdrawn) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/rounds/${roundId}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mergeTeams: merge }),
    }).catch(() => null);
    if (res?.ok) {
      setOpen(false);
      setUserId("");
      router.refresh();
    } else {
      setError(res ? await apiErrorMessage(res, "Couldn't withdraw the player") : "Couldn't reach the server");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-red-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded"
      >
        Withdraw a player…
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-100 bg-red-50/40 p-3 space-y-2">
      <label className="block text-xs font-medium text-gray-700">
        Withdraw from Group {groupNumber}
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          <option value="">Choose a player…</option>
          {players.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {move && mover && (
        <label className="flex items-start gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={merge}
            onChange={(e) => setMerge(e.target.checked)}
            className="mt-0.5 accent-fairway-700"
          />
          <span>
            Move {first(mover.name)} into Team {move.toTeam} so{" "}
            {joinNames(mergedTeam.map((p) => first(p.name)))} play as a {mergedTeam.length}-ball team (team handicap{" "}
            {ambroseTeamHandicap(mergedTeam.map((p) => p.playingHandicap))}). Holes already entered take the team&apos;s best score.
          </span>
        </label>
      )}

      {withdrawn && (
        <p className="text-xs text-gray-500">
          {first(withdrawn.name)}&apos;s scores for this round will be deleted and they&apos;ll be marked as not playing.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={!withdrawn || saving}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-40 transition-colors"
        >
          {saving ? "Withdrawing…" : "Withdraw"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setUserId(""); setError(""); }}
          disabled={saving}
          className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:border-gray-400 active:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 transition-colors"
        >
          Cancel
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
