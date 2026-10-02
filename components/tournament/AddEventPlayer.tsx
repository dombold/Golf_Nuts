"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

interface Player {
  id: string;
  name: string;
  handicapIndex: number;
}

/** Organiser invites a registered member who was missed when the event was created. */
export default function AddEventPlayer({ tournamentId, players }: { tournamentId: string; players: Player[] }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function close() {
    setOpen(false);
    setUserId("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Choose a player to invite");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => null);
    setSaving(false);
    if (!res) {
      setError("Couldn't reach the server");
      return;
    }
    if (!res.ok) {
      setError(await apiErrorMessage(res, "Couldn't send the invite"));
      return;
    }
    close();
    router.refresh();
  }

  if (!open) {
    const none = players.length === 0;
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={none}
          className="w-full py-2.5 border border-dashed border-fairway-300 text-fairway-700 rounded-xl text-sm font-medium hover:bg-fairway-50 active:bg-fairway-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Invite registered player
        </button>
        {none && <p className="text-xs text-gray-500 text-center">Every registered member has been invited</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-fairway-200 bg-fairway-50 p-4 space-y-3" noValidate>
      <div>
        <p className="text-sm font-semibold text-fairway-800">Invite a registered player</p>
        <p className="text-xs text-fairway-700 mt-0.5">
          They&apos;ll get the usual invite notification, with your note, and can accept or decline.
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-player`} className="block text-xs font-medium text-gray-600 mb-1">Player</label>
        <select
          id={`${id}-player`}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fairway-500"
        >
          <option value="">Select a player…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (HCP {p.handicapIndex})
            </option>
          ))}
        </select>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={close}
          className="flex-1 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 bg-fairway-700 text-white rounded-lg text-sm font-semibold hover:bg-fairway-800 active:bg-fairway-900 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-2"
        >
          {saving ? "Inviting…" : "Send invite"}
        </button>
      </div>
    </form>
  );
}
