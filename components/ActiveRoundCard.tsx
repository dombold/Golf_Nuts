"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActiveRoundCard({
  roundId,
  courseName,
}: {
  roundId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  async function handleDiscard() {
    setDiscarding(true);
    await fetch(`/api/rounds/${roundId}`, { method: "DELETE" });
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
        <p className="text-sm font-semibold text-red-800">Discard this round?</p>
        <p className="text-xs text-red-500 mt-0.5">{courseName} · This cannot be undone.</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDiscard}
            disabled={discarding}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {discarding ? "Discarding…" : "Discard Round"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-fairway-700 text-white px-4 py-3 flex items-center gap-3">
      <Link
        href={`/rounds/${roundId}/score`}
        className="flex-1 flex items-center justify-between min-w-0"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold">Round in progress</p>
          <p className="text-fairway-300 text-xs mt-0.5 truncate">{courseName}</p>
        </div>
        <span className="text-sm font-bold ml-3 shrink-0">Resume →</span>
      </Link>
      <button
        onClick={() => setConfirming(true)}
        className="text-fairway-400 hover:text-white text-xs underline shrink-0 transition-colors"
      >
        Discard
      </button>
    </div>
  );
}
