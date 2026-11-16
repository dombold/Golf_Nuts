"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 👍 toggle with the vote count. Updates at once, then refreshes the board so it re-sorts. */
export default function VoteButton({ suggestionId, votes, voted, disabled }: { suggestionId: string; votes: number; voted: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState({ votes, voted });
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !state.voted;
    const before = state;
    setState({ voted: next, votes: state.votes + (next ? 1 : -1) });
    setSaving(true);
    const res = await fetch(`/api/suggestions/${suggestionId}/vote`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voted: next }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setState({ voted: data.voted, votes: data.votes });
      router.refresh();
    } else {
      setState(before);
    }
    setSaving(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving || disabled}
      aria-pressed={state.voted}
      aria-label={`${state.voted ? "Remove your vote" : "Vote for this"} (${state.votes} vote${state.votes === 1 ? "" : "s"})`}
      className={`shrink-0 self-start w-12 flex flex-col items-center justify-center rounded-lg border py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-60 ${
        state.voted
          ? "bg-fairway-700 border-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900"
          : "bg-white border-gray-200 text-gray-700 hover:border-fairway-400 active:bg-fairway-50"
      }`}
    >
      <span aria-hidden="true" className="text-base leading-none">👍</span>
      <span className="text-sm font-bold leading-tight mt-0.5">{state.votes}</span>
    </button>
  );
}
