"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import { formatLabel } from "@/lib/gameFormats";

interface Props {
  tournamentId: string;
  tournamentName: string;
  courseName: string | null;
  format: string;
  date: string | null;
  organiserName: string;
  note?: string | null;
}

export default function InvitationResponseCard({
  tournamentId,
  tournamentName,
  courseName,
  format,
  date,
  organiserName,
  note,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  const [error, setError] = useState("");

  async function respond(status: "ACCEPTED" | "DECLINED") {
    setLoading(status === "ACCEPTED" ? "accept" : "decline");
    setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/invitations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (res?.ok) {
      router.refresh();
      return;
    }
    setError(res ? await apiErrorMessage(res, "Couldn't send your response.") : "Couldn't reach the server.");
    setLoading(null);
  }

  return (
    <div className="rounded-2xl border border-fairway-200 bg-fairway-50 p-5 space-y-4">
      <div>
        <p className="text-xs font-medium text-fairway-600 uppercase tracking-wide mb-1">
          You&apos;ve been invited
        </p>
        <h2 className="text-xl font-bold text-fairway-900">{tournamentName}</h2>
        <p className="text-sm text-gray-500 mt-0.5">Organised by {organiserName}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        {courseName && (
          <>
            <dt className="text-gray-500">Course</dt>
            <dd className="text-gray-800 font-medium">{courseName}</dd>
          </>
        )}
        <dt className="text-gray-500">Format</dt>
        <dd className="text-gray-800 font-medium">{formatLabel(format)}</dd>
        {date && (
          <>
            <dt className="text-gray-500">Date</dt>
            <dd className="text-gray-800 font-medium">
              {new Date(date).toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </>
        )}
      </dl>

      {note && (
        <div className="rounded-xl bg-white border border-fairway-100 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Note from {organiserName}</p>
          <p className="text-sm text-gray-800 whitespace-pre-line break-words">{note}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={() => respond("ACCEPTED")}
          disabled={!!loading}
          className="flex-1 py-2.5 bg-fairway-700 text-white rounded-xl font-semibold text-sm hover:bg-fairway-800 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:outline-none"
        >
          {loading === "accept" ? "Accepting…" : "Accept"}
        </button>
        <button
          onClick={() => respond("DECLINED")}
          disabled={!!loading}
          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:border-gray-400 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none"
        >
          {loading === "decline" ? "Declining…" : "Decline"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
