"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

/** Admin picks a new organiser for an event. */
export default function TransferOrganiser({
  tournamentId,
  organiserId,
  members,
}: {
  tournamentId: string;
  organiserId: string;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const selectId = useId();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function transfer() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/tournaments/${tournamentId}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => null);
    if (res?.ok) {
      setOpen(false);
      setUserId("");
      router.refresh();
    } else {
      setError(res ? await apiErrorMessage(res, "Couldn't transfer the event") : "Couldn't reach the server");
    }
    setBusy(false);
  }

  const btn = "text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btn} border border-fairway-200 text-fairway-700 hover:bg-fairway-50`}>
        Transfer
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex flex-wrap items-center justify-end gap-2">
        <label htmlFor={selectId} className="sr-only">New organiser</label>
        <select
          id={selectId}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          <option value="">New organiser…</option>
          {members.filter((m) => m.id !== organiserId).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => setOpen(false)} className={`${btn} border border-gray-300 text-gray-600 hover:bg-gray-50`}>
          Cancel
        </button>
        <button type="button" onClick={transfer} disabled={!userId || busy} className={`${btn} bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900`}>
          {busy ? "Working…" : "Transfer"}
        </button>
      </span>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
