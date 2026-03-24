"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tournamentId: string;
  canStart: boolean;
  blockedReason?: string;
}

export default function StartRoundButton({ tournamentId, canStart, blockedReason }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRound() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/start`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error ?? "Failed to start round");
      setConfirming(false);
    }
  }

  if (!canStart) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {blockedReason ?? "Groups must be saved before starting the round"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          Start Round
        </button>
      ) : (
        <div className="rounded-xl border border-fairway-300 bg-fairway-50 p-4 space-y-3">
          <p className="text-sm text-fairway-900 font-medium">
            This will create a live scoring round for each group. Ready to begin?
          </p>
          <div className="flex gap-3">
            <button
              onClick={startRound}
              disabled={loading}
              className="flex-1 py-2.5 bg-fairway-700 text-white rounded-xl text-sm font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              {loading ? "Starting…" : "Yes, start now"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-400 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
