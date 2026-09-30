"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Organiser's score lock for a completed event. Locked: players can no longer change their
 * scores; the organiser can still correct any group's card.
 */
export default function ScoreLockToggle({ tournamentId, lockedAt }: { tournamentId: string; lockedAt: string | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const locked = lockedAt !== null;

  async function toggle() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/lock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !locked }),
    }).catch(() => null);
    if (res?.ok) router.refresh();
    else setError(res ? await apiErrorMessage(res, "Couldn't update the lock") : "Couldn't reach the server");
    setSaving(false);
  }

  const lockedOn = lockedAt
    ? new Date(lockedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        {locked
          ? `🔒 Scores locked on ${lockedOn}. Players can't change their scores — you can still correct any group's card.`
          : "Lock the scores so players can't change them any further. You can still correct any group's card."}
      </p>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40 ${
          locked
            ? "border border-gray-300 text-gray-600 hover:border-gray-400 active:bg-gray-50"
            : "bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900"
        }`}
      >
        {saving ? "Saving…" : locked ? "Unlock scores" : "🔒 Lock scores"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
