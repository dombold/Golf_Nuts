"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import { STATUS_LABELS, type SuggestionStatusValue } from "@/lib/suggestions";

/** Administrators set a suggestion's status, and for Done, the version that delivered it. */
export default function AdminStatusControl({ suggestionId, status, doneVersion, appVersion }: { suggestionId: string; status: SuggestionStatusValue; doneVersion: string | null; appVersion: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [version, setVersion] = useState(doneVersion ?? appVersion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = value !== status || (value === "DONE" && version !== (doneVersion ?? ""));

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/suggestions/${suggestionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value, doneVersion: value === "DONE" ? version.trim() || null : null }),
    }).catch(() => null);
    if (res?.ok) router.refresh();
    else setError(res ? await apiErrorMessage(res, "Couldn't update the status") : "Couldn't reach the server");
    setSaving(false);
  }

  const field = "rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-2 py-2 text-xs text-gray-600">
      <span aria-hidden="true">🛡️</span>
      <label className="flex items-center gap-1">
        Status
        <select value={value} onChange={(e) => setValue(e.target.value as SuggestionStatusValue)} className={field}>
          {(Object.keys(STATUS_LABELS) as SuggestionStatusValue[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </label>
      {value === "DONE" && (
        <label className="flex items-center gap-1">
          in v
          <input value={version} onChange={(e) => setVersion(e.target.value)} className={`${field} w-16`} placeholder="1.7.0" />
        </label>
      )}
      {changed && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-2.5 py-1 rounded-lg font-semibold bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
      {error && <p role="alert" className="w-full text-red-600">{error}</p>}
    </div>
  );
}
