"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

type Status = "ACCEPTED" | "DECLINED" | "PENDING";

const OPTIONS: { value: Status; label: string; style: string }[] = [
  { value: "ACCEPTED", label: "Accepted", style: "bg-green-100 text-green-700 border-green-300" },
  { value: "DECLINED", label: "Declined", style: "bg-red-100 text-red-600 border-red-300" },
  { value: "PENDING", label: "Pending", style: "bg-amber-100 text-amber-700 border-amber-300" },
];

/**
 * Organiser's Accepted / Declined / Pending dropdown for one invitee on an upcoming event.
 * `status` comes from the server, so a player's own Accept/Decline shows here after a refresh.
 */
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
  // The value being saved, shown until the refreshed status arrives (or the save fails)
  const [saving, setSaving] = useState<Status | null>(null);
  const [error, setError] = useState("");

  const value = saving ?? status;
  const style = OPTIONS.find((o) => o.value === value)!.style;

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
    <div className="flex flex-col items-end gap-1 shrink-0">
      <select
        value={value}
        onChange={(e) => setStatus(e.target.value as Status)}
        disabled={!!saving}
        aria-label={`${name}'s status`}
        className={`text-xs font-medium rounded-lg border pl-2.5 pr-7 py-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-60 disabled:cursor-wait ${style}`}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-gray-800">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
