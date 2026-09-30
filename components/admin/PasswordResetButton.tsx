"use client";

import { useState } from "react";
import { apiErrorMessage } from "@/lib/apiError";

/** Emails a member a one-hour reset link, and shows the link so it can be passed on directly. */
export default function PasswordResetButton({ userId, name }: { userId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ resetUrl: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    setCopied(false);
    const res = await fetch(`/api/admin/users/${userId}/password-reset`, { method: "POST" }).catch(() => null);
    if (res?.ok) setResult(await res.json());
    else setError(res ? await apiErrorMessage(res, "Couldn't create a reset link") : "Couldn't reach the server");
    setBusy(false);
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.resetUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const btn = "text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40";

  return (
    <div className="space-y-2">
      <button type="button" onClick={send} disabled={busy} className={`${btn} border border-fairway-200 text-fairway-700 hover:bg-fairway-50`}>
        {busy ? "Sending…" : result ? "Send another reset link" : "Send password reset"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {result && (
        <div role="status" className="text-xs text-gray-600 space-y-1">
          <p>
            {result.emailed ? `Emailed to ${name}.` : "The email couldn't be sent."} The link works once, for one hour — you can also pass it on yourself:
          </p>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={result.resetUrl}
              aria-label="Password reset link"
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1 font-mono text-[11px] bg-gray-50"
            />
            <button type="button" onClick={copy} className={`${btn} border border-gray-300 text-gray-600 hover:bg-gray-50`}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
