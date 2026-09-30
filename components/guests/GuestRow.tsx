"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import GuestBadge from "@/components/guests/GuestBadge";

interface Member {
  id: string;
  name: string;
}

interface Props {
  guest: { id: string; name: string; handicapIndex: number };
  /** Extra line under the name, e.g. "3 rounds · added 2 months ago" */
  detail?: string;
  canAssign?: boolean;
  /** Remove outright — only for guests with no scores */
  canRemove?: boolean;
  /** Replace the name with "Guest N" — for guests whose scores are part of the results */
  canAnonymise?: boolean;
}

type Panel = null | "assign" | "remove" | "anonymise";

const smallBtn =
  "text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500";

/**
 * One guest player, with the organiser's actions:
 * - Assign to member: move their scores to someone who has since registered
 * - Remove (no scores yet) or Anonymise (scores kept, name dropped)
 */
export default function GuestRow({ guest, detail, canAssign, canRemove, canAnonymise }: Props) {
  const router = useRouter();
  const id = useId();
  const [panel, setPanel] = useState<Panel>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openPanel(next: Panel) {
    setPanel(next);
    setError("");
    setTargetId(null);
    setQuery("");
    if (next === "assign" && members === null) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => setMembers([...(d.currentUser ? [d.currentUser] : []), ...(d.users ?? [])]))
        .catch(() => setError("Couldn't load members"));
    }
  }

  async function run(url: string, init: RequestInit, fallback: string) {
    setBusy(true);
    setError("");
    const res = await fetch(url, init).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setPanel(null);
      router.refresh();
    } else {
      setError(res ? await apiErrorMessage(res, fallback) : "Couldn't reach the server");
    }
  }

  const assign = () =>
    run(
      `/api/guests/${guest.id}/reassign`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: targetId }) },
      "Couldn't assign the scores"
    );
  const remove = () => run(`/api/guests/${guest.id}`, { method: "DELETE" }, "Couldn't remove the guest");
  const anonymise = () => run(`/api/guests/${guest.id}/anonymise`, { method: "POST" }, "Couldn't anonymise the guest");

  const search = query.trim().toLowerCase();
  const matches = (members ?? []).filter((m) => !search || m.name.toLowerCase().includes(search));
  const target = members?.find((m) => m.id === targetId);

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 break-words">
            {guest.name} <GuestBadge className="ml-1" />
          </p>
          <p className="text-xs text-gray-400">HCP {guest.handicapIndex}{detail ? ` · ${detail}` : ""}</p>
        </div>
        {panel === null && (
          <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
            {canAssign && (
              <button
                type="button"
                onClick={() => openPanel("assign")}
                className={`${smallBtn} border-fairway-300 text-fairway-700 hover:bg-fairway-50 active:bg-fairway-100`}
              >
                Assign to member
              </button>
            )}
            {canRemove && (
              <button
                type="button"
                onClick={() => openPanel("remove")}
                className={`${smallBtn} border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100`}
              >
                Remove
              </button>
            )}
            {!canRemove && canAnonymise && (
              <button
                type="button"
                onClick={() => openPanel("anonymise")}
                className={`${smallBtn} border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100`}
              >
                Anonymise
              </button>
            )}
          </div>
        )}
      </div>

      {panel === "assign" && (
        <div className="rounded-lg border border-fairway-200 bg-fairway-50 p-3 space-y-2">
          {!target ? (
            <>
              <label htmlFor={`${id}-q`} className="block text-xs font-medium text-fairway-800">
                Which member is {guest.name}?
              </label>
              <input
                id={`${id}-q`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members…"
                autoComplete="off"
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fairway-500"
              />
              <div className="max-h-48 overflow-y-auto space-y-1" aria-live="polite">
                {members === null && !error && <p className="text-xs text-gray-500">Loading…</p>}
                {members !== null && matches.length === 0 && <p className="text-xs text-gray-500">No members match</p>}
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTargetId(m.id)}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-fairway-400 active:bg-fairway-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-fairway-900">
              Move all of {guest.name}&apos;s scores to <strong>{target.name}</strong>? The guest record is removed, and
              completed Strokeplay rounds will count towards {target.name}&apos;s handicap.
            </p>
          )}
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (target ? setTargetId(null) : setPanel(null))}
              className="flex-1 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              {target ? "Back" : "Cancel"}
            </button>
            {target && (
              <button
                type="button"
                onClick={assign}
                disabled={busy}
                className="flex-1 py-2 bg-fairway-700 text-white rounded-lg text-sm font-semibold hover:bg-fairway-800 active:bg-fairway-900 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-2"
              >
                {busy ? "Assigning…" : "Assign scores"}
              </button>
            )}
          </div>
        </div>
      )}

      {(panel === "remove" || panel === "anonymise") && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <p className="text-sm text-gray-700">
            {panel === "remove"
              ? `Remove ${guest.name}? They haven't recorded any scores.`
              : `Replace ${guest.name}'s name with "Guest N"? Their scores stay in the results. This can't be undone.`}
          </p>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="flex-1 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={panel === "remove" ? remove : anonymise}
              disabled={busy}
              className={`flex-1 py-2 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-2 ${
                panel === "remove" ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-800"
              }`}
            >
              {busy ? "Saving…" : panel === "remove" ? "Remove" : "Anonymise"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
