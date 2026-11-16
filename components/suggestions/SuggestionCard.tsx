"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import { STATUS_LABELS, SUGGESTION_BODY_MAX, SUGGESTION_TITLE_MAX, isOpenStatus } from "@/lib/suggestions";
import VoteButton from "./VoteButton";
import CommentThread from "./CommentThread";
import AdminStatusControl from "./AdminStatusControl";
import type { SuggestionView } from "./types";

const STATUS_STYLES = {
  OPEN: "",
  PLANNED: "bg-acorn-100 text-acorn-800",
  DONE: "bg-fairway-100 text-fairway-800",
  NOT_PLANNED: "bg-gray-100 text-gray-600",
} as const;

const inputClass =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500";

export default function SuggestionCard({ suggestion: s, isAdmin, appVersion }: { suggestion: SuggestionView; isAdmin: boolean; appVersion: string }) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(s.title);
  const [body, setBody] = useState(s.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canEdit = s.mine || isAdmin;

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/suggestions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    }).catch(() => null);
    if (res?.ok) {
      setEditing(false);
      router.refresh();
    } else {
      setError(res ? await apiErrorMessage(res, "Couldn't save your changes") : "Couldn't reach the server");
    }
    setSaving(false);
  }

  async function remove() {
    if (!confirm("Delete this suggestion and its votes and comments?")) return;
    const res = await fetch(`/api/suggestions/${s.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) router.refresh();
    else setError(res ? await apiErrorMessage(res, "Couldn't delete the suggestion") : "Couldn't reach the server");
  }

  const smallLink = "text-xs text-gray-500 hover:text-fairway-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded";

  return (
    <article className="bg-white rounded-xl border border-fairway-50 shadow-sm p-4">
      <div className="flex gap-3">
        <VoteButton key={`${s.votes}-${s.voted}`} suggestionId={s.id} votes={s.votes} voted={s.voted} disabled={!isOpenStatus(s.status)} />
        <div className="flex-1 min-w-0">
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-2">
              <label className="sr-only" htmlFor={`title-${s.id}`}>Title</label>
              <input id={`title-${s.id}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={SUGGESTION_TITLE_MAX} required className={inputClass} />
              <label className="sr-only" htmlFor={`body-${s.id}`}>Details</label>
              <textarea id={`body-${s.id}`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={SUGGESTION_BODY_MAX} rows={4} className={inputClass} />
              <div className="flex gap-2">
                <button type="submit" disabled={saving || title.trim().length < 3} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-fairway-700 text-white hover:bg-fairway-800 active:bg-fairway-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => { setEditing(false); setTitle(s.title); setBody(s.body); }} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:border-gray-400 active:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="text-sm font-semibold text-fairway-900 break-words">{s.title}</h2>
                {s.status !== "OPEN" && (
                  <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${STATUS_STYLES[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                    {s.status === "DONE" && s.doneVersion && (
                      <>
                        {" "}in{" "}
                        <Link href="/whats-new" className="underline hover:text-fairway-950">v{s.doneVersion}</Link>
                      </>
                    )}
                  </span>
                )}
              </div>
              {s.body && <p className="text-sm text-gray-700 whitespace-pre-line mt-1 break-words">{s.body}</p>}
            </>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <span className="text-xs text-gray-400">{s.authorName} · {s.date}</span>
            <button type="button" onClick={() => setShowComments((v) => !v)} aria-expanded={showComments} className={smallLink}>
              💬 {s.comments.length} comment{s.comments.length === 1 ? "" : "s"}
            </button>
            {canEdit && !editing && (
              <>
                <button type="button" onClick={() => setEditing(true)} className={smallLink}>Edit</button>
                <button type="button" onClick={remove} className="text-xs text-gray-500 hover:text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded">Delete</button>
              </>
            )}
          </div>
          {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      </div>
      {isAdmin && <AdminStatusControl suggestionId={s.id} status={s.status} doneVersion={s.doneVersion} appVersion={appVersion} />}
      {showComments && <CommentThread suggestionId={s.id} comments={s.comments} isAdmin={isAdmin} />}
    </article>
  );
}
