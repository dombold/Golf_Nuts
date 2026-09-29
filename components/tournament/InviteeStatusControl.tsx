"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

type Status = "ACCEPTED" | "DECLINED" | "PENDING";

const OPTIONS: { value: Status; label: string; active: string }[] = [
  { value: "ACCEPTED", label: "In", active: "bg-green-100 text-green-700 border-green-300" },
  { value: "DECLINED", label: "Out", active: "bg-red-100 text-red-600 border-red-300" },
  { value: "PENDING", label: "Pending", active: "bg-amber-100 text-amber-700 border-amber-300" },
];

/** Organiser's In / Out / Pending switch for one invitee on an upcoming event. */
export default function InviteeStatusControl({
  tournamentId,
  userId,
  name,
  status,
}: {
  tournamentId: string;
  userId: string;
  name: string;
  status: Status;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<Status | null>(null);
  const [error, setError] = useState("");

  async function setStatus(next: Status) {
    if (next === status || saving) return;
    setSaving(next);
    setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/invitations/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    if (res?.ok) router.refresh();
    else setError(res ? await apiErrorMessage(res, "Couldn't update") : "Couldn't reach the server");
    setSaving(null);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div role="group" aria-label={`${name}'s status`} className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
        {OPTIONS.map((opt) => {
          const current = opt.value === status;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={current}
              disabled={!!saving}
              onClick={() => setStatus(opt.value)}
              className={`px-2.5 py-1 border-l first:border-l-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fairway-500 disabled:opacity-60 ${
                current ? opt.active : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {saving === opt.value ? "…" : opt.label}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
