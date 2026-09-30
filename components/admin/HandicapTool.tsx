"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";

type Mode = "recalculate" | "rebuild";
interface Change { userId: string; name: string; isGuest: boolean; before: number; after: number | null }
interface Result { dryRun: boolean; roundsRebuilt: number; changes: Change[] }

const MODE_HELP: Record<Mode, string> = {
  recalculate: "Recalculate from the stored round differentials.",
  rebuild: "Recompute every completed strokeplay round's differential with the current WHS method, then recalculate.",
};

/**
 * Preview-then-apply handicap maintenance for one member, or everyone when `userId` is omitted.
 * The preview is a dry run; nothing is written until Apply.
 */
export default function HandicapTool({ userId, onDone }: { userId?: string; onDone?: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("recalculate");
  const [preview, setPreview] = useState<Result | null>(null);
  const [applied, setApplied] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(dryRun: boolean) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/handicaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, userId, dryRun }),
    }).catch(() => null);
    if (res?.ok) {
      const data: Result = await res.json();
      if (dryRun) setPreview(data);
      else {
        setPreview(null);
        setApplied(data);
        router.refresh();
      }
    } else {
      setError(res ? await apiErrorMessage(res, "Couldn't run the handicap tool") : "Couldn't reach the server");
    }
    setBusy(false);
  }

  const shown = applied ?? preview;
  // Everyone: only list members whose index would move (and skip guests), so the table stays readable
  const rows = shown?.changes.filter((c) => (userId ? true : !c.isGuest && c.after !== null && c.after !== c.before)) ?? [];
  const changedCount = shown?.changes.filter((c) => c.after !== null && c.after !== c.before).length ?? 0;
  const btn = "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40";

  return (
    <div className="space-y-3">
      <fieldset className="space-y-1.5" disabled={busy}>
        <legend className="sr-only">Handicap method</legend>
        {(["recalculate", "rebuild"] as const).map((m) => (
          <label key={m} className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name={`hc-mode-${userId ?? "all"}`}
              checked={mode === m}
              onChange={() => {
                setMode(m);
                setPreview(null);
                setApplied(null);
              }}
              className="mt-1 accent-fairway-700"
            />
            <span>
              <span className="font-medium capitalize">{m}</span>
              <span className="block text-xs text-gray-500">{MODE_HELP[m]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => run(true)} disabled={busy} className={`${btn} border border-fairway-200 text-fairway-700 hover:bg-fairway-50`}>
          {busy && !preview ? "Checking…" : "Preview changes"}
        </button>
        {preview && (
          <button type="button" onClick={() => run(false)} disabled={busy} className={`${btn} bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900`}>
            {busy ? "Applying…" : `Apply${changedCount ? ` (${changedCount} change${changedCount === 1 ? "" : "s"})` : ""}`}
          </button>
        )}
        {onDone && (
          <button type="button" onClick={onDone} className={`${btn} border border-gray-300 text-gray-600 hover:bg-gray-50`}>
            Close
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

      {shown && (
        <div role="status" className="space-y-2">
          <p className="text-xs text-gray-600">
            {shown.dryRun ? "Preview — nothing saved yet. " : "Saved. "}
            {mode === "rebuild" && `${shown.roundsRebuilt} round differential${shown.roundsRebuilt === 1 ? "" : "s"} ${shown.dryRun ? "checked" : "rebuilt"}. `}
            {changedCount === 0 ? "No handicap changes." : `${changedCount} handicap${changedCount === 1 ? "" : "s"} ${shown.dryRun ? "would change" : "changed"}.`}
          </p>
          {rows.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500">
                  <th scope="col" className="font-medium py-1">Member</th>
                  <th scope="col" className="font-medium py-1 text-right">Before</th>
                  <th scope="col" className="font-medium py-1 text-right">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((c) => (
                  <tr key={c.userId}>
                    <td className="py-1 text-gray-800">{c.name}</td>
                    <td className="py-1 text-right tabular-nums text-gray-600">{c.before.toFixed(1)}</td>
                    <td className={`py-1 text-right tabular-nums ${c.after !== null && c.after !== c.before ? "font-semibold text-fairway-800" : "text-gray-600"}`}>
                      {c.after === null ? "kept (under 3 rounds)" : c.after.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
