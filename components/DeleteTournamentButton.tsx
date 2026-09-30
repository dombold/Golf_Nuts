"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

/** `warning`: what else goes with the event (its rounds, handicap effects) — shown at the confirm step. */
export default function DeleteTournamentButton({ tournamentId, warning }: { tournamentId: string; warning?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      router.refresh();
      return;
    }
    setError(res ? await apiErrorMessage(res, "Couldn't delete the event.") : "Couldn't reach the server.");
    setDeleting(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {warning && <p className="w-full text-xs text-red-700 text-right">{warning}</p>}
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Confirm"}
        </button>
      </div>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={() => setConfirming(true)}
        className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
      >
        Delete
      </button>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
