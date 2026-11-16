"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import { SUGGESTION_BODY_MAX, SUGGESTION_TITLE_MAX } from "@/lib/suggestions";

const inputClass =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500";

/** "+ New suggestion" — opens a short form; the new suggestion starts with the author's vote. */
export default function SuggestionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    }).catch(() => null);
    if (res?.ok) {
      setTitle("");
      setBody("");
      setOpen(false);
      router.refresh();
    } else {
      setError(res ? await apiErrorMessage(res, "Couldn't post your suggestion") : "Couldn't reach the server");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-2"
      >
        + New suggestion
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-fairway-100 shadow-sm p-4 space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Your idea or problem
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={SUGGESTION_TITLE_MAX}
          required
          placeholder="e.g. Show my best round at each course"
          className={`${inputClass} mt-1`}
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Details <span className="font-normal text-gray-400">(optional)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={SUGGESTION_BODY_MAX}
          rows={4}
          placeholder="What would you like, and why would it help?"
          className={`${inputClass} mt-1`}
        />
      </label>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || title.trim().length < 3}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          {saving ? "Posting…" : "Post suggestion"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:border-gray-400 active:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
