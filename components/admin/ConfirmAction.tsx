"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

/** A small admin action button with an inline "are you sure?" step; refreshes the page when done. */
export default function ConfirmAction({
  url,
  method = "POST",
  body,
  label,
  confirmLabel = "Confirm",
  prompt,
  danger = false,
}: {
  url: string;
  method?: "POST" | "DELETE" | "PATCH" | "PUT";
  body?: unknown;
  label: string;
  confirmLabel?: string;
  /** Shown beside the confirm buttons */
  prompt?: string;
  danger?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null);
    if (res?.ok) {
      setConfirming(false);
      router.refresh();
    } else {
      setError(res ? await apiErrorMessage(res, "Something went wrong") : "Couldn't reach the server");
    }
    setBusy(false);
  }

  const base =
    "text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40";

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {confirming ? (
        <span className="inline-flex flex-wrap items-center justify-end gap-2">
          {prompt && <span className="text-xs text-gray-600">{prompt}</span>}
          <button type="button" onClick={() => setConfirming(false)} className={`${base} border border-gray-300 text-gray-600 hover:bg-gray-50`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className={`${base} text-white ${danger ? "bg-red-600 hover:bg-red-700 active:bg-red-800" : "bg-fairway-700 hover:bg-fairway-800 active:bg-fairway-900"}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`${base} border ${danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-fairway-200 text-fairway-700 hover:bg-fairway-50"}`}
        >
          {label}
        </button>
      )}
      {error && <span role="alert" className="text-xs text-red-600 text-right">{error}</span>}
    </span>
  );
}
