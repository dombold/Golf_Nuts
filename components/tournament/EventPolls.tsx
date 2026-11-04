"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiError";
import {
  POLL_MAX,
  POLL_OPTION_MAX,
  POLL_OPTIONS_MAX,
  POLL_OPTIONS_MIN,
  POLL_QUESTION_MAX,
  PollSchema,
  firstIssue,
  type PollSummary,
} from "@/lib/polls";

interface PollPlayer {
  id: string;
  name: string;
  isGuest: boolean;
}

interface Props {
  tournamentId: string;
  polls: PollSummary[];
  /** Organiser (or admin) can add, close, reopen and delete polls */
  canManage: boolean;
  /** Viewer is an invitee who hasn't declined, and the event isn't complete */
  canVote: boolean;
  /** Event is complete — polls are read-only results */
  complete: boolean;
  /** Organiser only: invitees (not declined) they can record a vote for */
  players: PollPlayer[];
}

const firstName = (name: string) => name.split(" ")[0];

export default function EventPolls({ tournamentId, polls, canManage, canVote, complete, players }: Props) {
  const [adding, setAdding] = useState(false);
  const canAdd = canManage && !complete && polls.length < POLL_MAX;

  return (
    <section aria-labelledby="polls-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="polls-heading" className="text-base font-semibold text-fairway-900">
          Polls
        </h2>
        {canAdd && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm font-medium text-fairway-700 px-2 py-1 rounded-lg hover:bg-fairway-50 active:bg-fairway-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
          >
            + Add a poll
          </button>
        )}
      </div>

      {adding && <NewPollForm tournamentId={tournamentId} onDone={() => setAdding(false)} />}

      {polls.length === 0 && !adding && (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          Need players to choose something, like lunch? Add a poll and they can vote from the event page.
        </p>
      )}

      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          tournamentId={tournamentId}
          poll={poll}
          canManage={canManage && !complete}
          canVote={canVote && !poll.closed}
          players={players}
        />
      ))}

      {canManage && !complete && polls.length >= POLL_MAX && (
        <p className="text-xs text-gray-500">An event can have up to {POLL_MAX} polls.</p>
      )}
    </section>
  );
}

function PollCard({
  tournamentId,
  poll,
  canManage,
  canVote,
  players,
}: {
  tournamentId: string;
  poll: PollSummary;
  canManage: boolean;
  canVote: boolean;
  players: PollPlayer[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const base = `/api/tournaments/${tournamentId}/polls/${poll.id}`;

  async function send(key: string, url: string, init: RequestInit, fallback: string) {
    setBusy(key);
    setError("");
    const res = await fetch(url, init).catch(() => null);
    if (res?.ok) router.refresh();
    else setError(res ? await apiErrorMessage(res, fallback) : "Couldn't reach the server");
    setBusy(null);
  }

  const json = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  function vote(optionId: string) {
    if (optionId === poll.myOptionId) return;
    send(`vote-${optionId}`, `${base}/vote`, json("PUT", { optionId }), "Couldn't save your vote");
  }

  function remove() {
    if (!confirm(`Delete the poll “${poll.question}” and all its votes?`)) return;
    send("delete", base, { method: "DELETE" }, "Couldn't delete the poll");
  }

  const questionId = `poll-${poll.id}-q`;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p id={questionId} className="text-sm font-semibold text-fairway-900 break-words">
          {poll.question}
        </p>
        {poll.closed && (
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Closed</span>
        )}
      </div>

      <div role="radiogroup" aria-labelledby={questionId} aria-disabled={!canVote || undefined} className="space-y-2">
        {poll.options.map((o) => {
          const selected = o.id === poll.myOptionId;
          const share = poll.total > 0 ? Math.round((o.count / poll.total) * 100) : 0;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!canVote || busy !== null}
              onClick={() => vote(o.id)}
              className={`w-full text-left rounded-lg border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-1 ${
                selected
                  ? "bg-fairway-700 border-fairway-700 text-white"
                  : "bg-white border-gray-200 text-gray-800 enabled:hover:border-fairway-400 enabled:hover:bg-fairway-50 enabled:active:bg-fairway-100"
              } disabled:cursor-default`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium break-words">
                  {selected && <span aria-hidden="true">✓ </span>}
                  {o.label}
                </span>
                <span className={`shrink-0 text-xs font-semibold ${selected ? "text-fairway-100" : "text-gray-500"}`}>
                  {o.count} {o.count === 1 ? "vote" : "votes"}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`mt-1.5 block h-1.5 rounded-full overflow-hidden ${selected ? "bg-fairway-600" : "bg-gray-100"}`}
              >
                <span
                  className={`block h-full rounded-full ${selected ? "bg-white" : "bg-fairway-400"}`}
                  style={{ width: `${share}%` }}
                />
              </span>
              {o.voters.length > 0 && (
                <span className={`mt-1 block text-xs break-words ${selected ? "text-fairway-100" : "text-gray-500"}`}>
                  {o.voters.map((v) => firstName(v.name) + (v.byOrganiser ? " (by organiser)" : "")).join(", ")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        {poll.total} {poll.total === 1 ? "vote" : "votes"}
        {canVote && (poll.myOptionId ? " · tap another option to change your vote" : " · tap an option to vote")}
      </p>

      {canManage && !poll.closed && players.length > 0 && (
        recording ? (
          <RecordVoteForm
            tournamentId={tournamentId}
            poll={poll}
            players={players}
            onDone={() => setRecording(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setRecording(true)}
            className="text-sm font-medium text-fairway-700 px-2 py-1 -ml-2 rounded-lg hover:bg-fairway-50 active:bg-fairway-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
          >
            Record a vote for someone
          </button>
        )
      )}

      {canManage && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => send("close", base, json("PATCH", { closed: !poll.closed }), "Couldn't update the poll")}
            className="flex-1 py-2 rounded-lg border border-fairway-300 text-sm font-medium text-fairway-700 hover:bg-fairway-50 active:bg-fairway-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40"
          >
            {busy === "close" ? "Saving…" : poll.closed ? "Reopen poll" : "Close poll"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={remove}
            className="px-4 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-40"
          >
            {busy === "delete" ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Organiser records or clears a vote for an invited player (e.g. told them in person, or a guest). */
function RecordVoteForm({
  tournamentId,
  poll,
  players,
  onDone,
}: {
  tournamentId: string;
  poll: PollSummary;
  players: PollPlayer[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [optionId, setOptionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const current = playerId ? (poll.votesByUser[playerId] ?? "") : "";
  const ids = { player: `record-${poll.id}-player`, option: `record-${poll.id}-option` };

  function choosePlayer(id: string) {
    setPlayerId(id);
    setOptionId(id ? (poll.votesByUser[id] ?? "") : "");
    setError("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/polls/${poll.id}/votes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: playerId, optionId: optionId || null }),
    }).catch(() => null);
    if (res?.ok) {
      router.refresh();
      onDone();
      return;
    }
    setError(res ? await apiErrorMessage(res, "Couldn't record the vote") : "Couldn't reach the server");
    setSaving(false);
  }

  const selectClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-fairway-500";

  return (
    <form onSubmit={save} className="rounded-lg border border-fairway-200 bg-fairway-50 p-3 space-y-3">
      <p className="text-xs text-gray-600">
        For a player who told you their choice, or a guest. It shows as “(by organiser)” until they vote themselves.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor={ids.player} className="block text-xs font-medium text-gray-700">Player</label>
          <select id={ids.player} value={playerId} onChange={(e) => choosePlayer(e.target.value)} className={selectClass}>
            <option value="">Choose a player…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isGuest ? " (guest)" : ""}
                {poll.votesByUser[p.id] ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.option} className="block text-xs font-medium text-gray-700">Choice</label>
          <select
            id={ids.option}
            value={optionId}
            onChange={(e) => setOptionId(e.target.value)}
            disabled={!playerId}
            className={`${selectClass} disabled:bg-gray-50 disabled:text-gray-400`}
          >
            <option value="">No vote</option>
            {poll.options.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !playerId || optionId === current}
          className="flex-1 py-2 rounded-lg bg-fairway-700 text-white text-sm font-semibold hover:bg-fairway-800 active:bg-fairway-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-1 disabled:opacity-40"
        >
          {saving ? "Saving…" : optionId === "" && current ? "Clear vote" : "Save vote"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function NewPollForm({ tournamentId, onDone }: { tournamentId: string; onDone: () => void }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(Array(POLL_OPTIONS_MIN).fill(""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setOption = (i: number, value: string) => {
    setError("");
    setOptions((prev) => prev.map((o, j) => (j === i ? value : o)));
  };
  const removeOption = (i: number) => {
    setError("");
    setOptions((prev) => prev.filter((_, j) => j !== i));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = PollSchema.safeParse({ question, options });
    if (!parsed.success) {
      setError(firstIssue(parsed.error));
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    if (res?.ok) {
      router.refresh();
      onDone();
      return;
    }
    setError(res ? await apiErrorMessage(res, "Couldn't create the poll") : "Couldn't reach the server");
    setSaving(false);
  }

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500 text-sm";

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-fairway-200 shadow-sm px-4 py-4 space-y-4">
      <div className="space-y-1">
        <label htmlFor="poll-question" className="block text-sm font-medium text-gray-700">
          Question
        </label>
        <input
          id="poll-question"
          value={question}
          onChange={(e) => {
            setError("");
            setQuestion(e.target.value);
          }}
          maxLength={POLL_QUESTION_MAX}
          placeholder="e.g. What would you like for lunch?"
          aria-describedby="poll-question-count"
          className={inputClass}
        />
        <p id="poll-question-count" className="text-right text-xs text-gray-400">
          {question.length}/{POLL_QUESTION_MAX}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700 mb-1">Options</legend>
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={o}
              onChange={(e) => setOption(i, e.target.value)}
              maxLength={POLL_OPTION_MAX}
              aria-label={`Option ${i + 1}`}
              placeholder={`Option ${i + 1}`}
              className={inputClass}
            />
            {options.length > POLL_OPTIONS_MIN && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                aria-label={`Remove option ${i + 1}`}
                className="shrink-0 w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {options.length < POLL_OPTIONS_MAX && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="text-sm font-medium text-fairway-700 px-2 py-1 rounded-lg hover:bg-fairway-50 active:bg-fairway-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
          >
            + Add option
          </button>
        )}
      </fieldset>

      <p className="text-xs text-gray-500">
        Players pick one option and can change their vote. Everyone can see who chose what. Invited players get a
        notification.
      </p>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-fairway-700 text-white text-sm font-semibold hover:bg-fairway-800 active:bg-fairway-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-2 disabled:opacity-40"
        >
          {saving ? "Creating…" : "Create poll"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
