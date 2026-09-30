"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

interface Impact {
  members: { id: string; username: string; name: string }[];
  events: { id: string; name: string; otherInvitees: string[] }[];
  rounds: number;
  blockingRounds: { id: string; label: string; otherPlayers: string[] }[];
  problems: string[];
}

/** Preview, then delete, the selected member accounts (typed confirmation). */
export default function DeleteMembers({ userIds, onDone }: { userIds: string[]; onDone: () => void }) {
  const router = useRouter();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletedNames, setDeletedNames] = useState<string | null>(null);

  async function post(body: object) {
    return fetch("/api/admin/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, ...body }),
    }).catch(() => null);
  }

  async function loadPreview() {
    setBusy(true);
    setError("");
    const res = await post({ preview: true });
    if (res?.ok) setImpact((await res.json()).impact);
    else setError(res ? await apiErrorMessage(res, "Couldn't check what would be deleted") : "Couldn't reach the server");
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setError("");
    const res = await post({ confirm });
    if (res?.ok) {
      setDeletedNames(impact?.members.map((m) => m.name).join(", ") ?? "");
      setImpact(null);
      setConfirm("");
      router.refresh();
      onDone();
    } else {
      setError(res ? await apiErrorMessage(res, "Couldn't delete") : "Couldn't reach the server");
    }
    setBusy(false);
  }

  const btn = "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40";

  if (deletedNames !== null && userIds.length === 0) {
    return <p role="status" className="text-xs text-fairway-700">Deleted {deletedNames}.</p>;
  }
  if (userIds.length === 0) return null;

  if (!impact) {
    return (
      <div className="space-y-1">
        <button type="button" onClick={loadPreview} disabled={busy} className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`}>
          {busy ? "Checking…" : `Delete ${userIds.length} selected…`}
        </button>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const blocked = impact.problems.length > 0;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3 text-sm">
      <p className="font-semibold text-red-800">
        Delete {impact.members.map((m) => `${m.name} (@${m.username})`).join(", ")}?
      </p>
      <ul className="list-disc pl-5 text-xs text-gray-700 space-y-1">
        <li>
          {impact.events.length} event{impact.events.length === 1 ? "" : "s"} they organised
          {impact.events.length > 0 && `: ${impact.events.map((e) => e.name).join(", ")}`}
        </li>
        {impact.events.some((e) => e.otherInvitees.length > 0) && (
          <li>
            Other members invited to those events lose the invitation:{" "}
            {[...new Set(impact.events.flatMap((e) => e.otherInvitees))].join(", ")}
          </li>
        )}
        <li>{impact.rounds} round{impact.rounds === 1 ? "" : "s"} only they played, with scores and handicap history</li>
        <li>Their profile, invitations, comments and likes</li>
      </ul>

      {blocked ? (
        <div role="alert" className="space-y-2 text-xs text-red-700">
          <p className="font-semibold">This can&apos;t go ahead:</p>
          <ul className="list-disc pl-5 space-y-1">
            {impact.problems.map((p) => <li key={p}>{p}</li>)}
            {impact.blockingRounds.slice(0, 5).map((r) => (
              <li key={r.id}>{r.label} — also played by {r.otherPlayers.join(", ")}</li>
            ))}
            {impact.blockingRounds.length > 5 && <li>…and {impact.blockingRounds.length - 5} more</li>}
          </ul>
        </div>
      ) : (
        <label className="block text-xs text-gray-700">
          This can&apos;t be undone. Type <span className="font-mono font-semibold">DELETE</span> to confirm.
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full max-w-xs border border-red-300 rounded-lg px-3 py-1.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          />
        </label>
      )}

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={() => setImpact(null)} className={`${btn} border border-gray-300 text-gray-600 bg-white hover:bg-gray-50`}>
          Cancel
        </button>
        {!blocked && (
          <button
            type="button"
            onClick={remove}
            disabled={busy || confirm !== "DELETE"}
            className={`${btn} bg-red-600 text-white hover:bg-red-700 active:bg-red-800`}
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        )}
      </div>
    </div>
  );
}
