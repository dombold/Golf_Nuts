"use client";

import { useId, useRef, useState } from "react";
import { describeDataIssues, type TeeDataIssue } from "@/lib/teeDataIssues";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
const MAX_MB = 10;

interface Props {
  courseId: string;
  /** What is missing on the chosen tee (or across the course when no tee is given) */
  issues: readonly TeeDataIssue[];
  teeId?: string;
  teeName?: string;
}

/**
 * Amber notice shown wherever a course/tee with incomplete scorecard data is chosen.
 * Explains the consequences and lets the player send the administrator a copy of the scorecard.
 */
export default function IncompleteDataNotice({ courseId, issues, teeId, teeName }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const fileId = useId();
  const noteId = useId();

  if (issues.length === 0) return null;
  const missing = describeDataIssues(issues);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a photo or PDF of the scorecard");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`The file must be under ${MAX_MB} MB`);
      return;
    }
    setSending(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    if (teeId) body.append("teeId", teeId);
    const note = noteRef.current?.value.trim();
    if (note) body.append("note", note);
    try {
      const res = await fetch(`/api/courses/${courseId}/scorecard`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message ?? data.error ?? "Upload failed — please try again");
        return;
      }
      setSent(true);
      setOpen(false);
    } catch {
      setError("Upload failed — check your connection and try again");
    } finally {
      setSending(false);
    }
  }

  return (
    <div role="status" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 space-y-2">
      <p>
        <span className="font-semibold">Scorecard data incomplete</span>
        {teeName ? ` (${teeName} tees)` : ""} — missing {missing.join("; ")}.
      </p>
      <p className="text-amber-800">
        Rounds here don&apos;t count towards your handicap, and net and Stableford results are approximate.
      </p>

      {sent ? (
        <p className="font-medium text-fairway-800">Thanks — the administrator has your scorecard.</p>
      ) : !open ? (
        <div className="space-y-1">
          <p className="text-amber-800">Have a copy of the scorecard? Send it to the administrator so the course can be completed.</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 active:bg-amber-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Send scorecard
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2 pt-1">
          <div>
            <label htmlFor={fileId} className="block text-xs font-semibold text-amber-900 mb-1">
              Photo or PDF of the scorecard (max {MAX_MB} MB)
            </label>
            <input
              id={fileId}
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              required
              className="block w-full text-xs text-amber-900 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-white file:text-amber-900 file:font-semibold file:shadow-sm hover:file:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor={noteId} className="block text-xs font-semibold text-amber-900 mb-1">
              Note for the administrator (optional)
            </label>
            <textarea
              id={noteId}
              ref={noteRef}
              rows={2}
              maxLength={500}
              placeholder="e.g. which tees the card covers"
              className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              {sending ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-amber-900 hover:bg-amber-100 active:bg-amber-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Small chip for tee buttons/options whose scorecard data is incomplete. */
export function IncompleteChip() {
  return (
    <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 align-middle">
      Incomplete
    </span>
  );
}
