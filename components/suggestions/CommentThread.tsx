"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import { SUGGESTION_COMMENT_MAX } from "@/lib/suggestions";
import type { SuggestionView } from "./types";

/** Comments under a suggestion: the list, delete for the author/admin, and an add box. */
export default function CommentThread({ suggestionId, comments, isAdmin }: { suggestionId: string; comments: SuggestionView["comments"]; isAdmin: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/suggestions/${suggestionId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);
    if (res?.ok) {
      setBody("");
      router.refresh();
    } else {
      setError(res ? await apiErrorMessage(res, "Couldn't post your comment") : "Couldn't reach the server");
    }
    setSaving(false);
  }

  async function remove(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch(`/api/suggestions/${suggestionId}/comments/${commentId}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) router.refresh();
    else setError(res ? await apiErrorMessage(res, "Couldn't delete the comment") : "Couldn't reach the server");
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
      {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
      {comments.map((c) => (
        <div key={c.id} className="text-sm">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{c.userName}</span> · {c.date}
            {(c.mine || isAdmin) && (
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="ml-2 text-gray-400 hover:text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded"
              >
                Delete
              </button>
            )}
          </p>
          <p className="text-gray-700 whitespace-pre-line mt-0.5">{c.body}</p>
        </div>
      ))}
      <form onSubmit={add} className="flex gap-2">
        <label className="sr-only" htmlFor={`comment-${suggestionId}`}>Add a comment</label>
        <input
          id={`comment-${suggestionId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={SUGGESTION_COMMENT_MAX}
          placeholder="Add a comment…"
          className="flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        />
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          {saving ? "…" : "Post"}
        </button>
      </form>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
