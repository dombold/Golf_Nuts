/**
 * Offline scoring: scores are queued on the phone (localStorage) when Save is tapped and sent to
 * POST /api/rounds/[id]/score whenever there's signal. The API upserts by player + hole, so
 * sending the same score twice is harmless.
 *
 * Browser-only. Every storage call is wrapped in try/catch: if storage is unavailable (private
 * window, full), queueScores returns false and the caller sends directly instead.
 */

export interface QueuedScore {
  roundPlayerId: string;
  holeNumber: number;
  strokes: number;
  penalties: number;
  putts?: number;
  fairwayHit?: boolean;
  gir?: boolean;
  /** When this entry was saved on the phone (ms). Used so a send doesn't remove a newer edit. */
  enteredAt: number;
}

/** A score as the server stores it */
export interface ServerScore {
  roundPlayerId: string;
  holeNumber: number;
  strokes: number;
  penalties: number;
  putts: number | null;
  fairwayHit: boolean | null;
  gir: boolean | null;
}

export type SendResult =
  | { kind: "sent" }
  | { kind: "superseded"; score: ServerScore } // a newer score (another phone's) was already stored and kept
  | { kind: "offline" } // no connection — keep and retry
  | { kind: "retry" } // server error — keep and retry
  | { kind: "signedOut" } // 401 — keep until the player signs in again
  | { kind: "rejected"; message: string }; // 400/403/404 — the server will never accept it

export interface FlushResult {
  sent: number;
  offline: boolean;
  signedOut: boolean;
  rejected: { entry: QueuedScore; message: string }[];
  /** Entries the server ignored because a newer score was already stored */
  superseded: { entry: QueuedScore; score: ServerScore }[];
}

type Outbox = Record<string, QueuedScore>;

const outboxKey = (roundId: string) => `golfnuts:outbox:${roundId}`;
const roundKey = (roundId: string) => `golfnuts:round:${roundId}`;
const ROUND_INDEX_KEY = "golfnuts:rounds";
/** How many rounds' data to keep for opening the score page offline */
const MAX_CACHED_ROUNDS = 3;
const entryKey = (e: Pick<QueuedScore, "roundPlayerId" | "holeNumber">) => `${e.roundPlayerId}:${e.holeNumber}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to remove */
  }
}

function writeOutbox(roundId: string, outbox: Outbox): boolean {
  if (Object.keys(outbox).length === 0) {
    remove(outboxKey(roundId));
    return true;
  }
  return write(outboxKey(roundId), outbox);
}

// ─── Outbox ──────────────────────────────────────────────────────────────────

/** Queue scores on the phone. A newer entry for the same player and hole replaces the older one. */
export function queueScores(roundId: string, entries: QueuedScore[]): boolean {
  if (entries.length === 0) return true;
  const outbox = read<Outbox>(outboxKey(roundId)) ?? {};
  for (const e of entries) outbox[entryKey(e)] = e;
  return writeOutbox(roundId, outbox);
}

/** Scores saved on the phone that the server doesn't have yet */
export function pendingScores(roundId: string): QueuedScore[] {
  return Object.values(read<Outbox>(outboxKey(roundId)) ?? {});
}

/** Number of distinct holes with scores still waiting to send */
export function pendingHoleCount(roundId: string): number {
  return new Set(pendingScores(roundId).map((e) => e.holeNumber)).size;
}

/** Remove an entry, unless it was edited again after `sent` was queued */
function removeIfUnchanged(roundId: string, sent: QueuedScore) {
  const outbox = read<Outbox>(outboxKey(roundId));
  const current = outbox?.[entryKey(sent)];
  if (!outbox || !current || current.enteredAt !== sent.enteredAt) return;
  delete outbox[entryKey(sent)];
  writeOutbox(roundId, outbox);
}

// ─── Sending ─────────────────────────────────────────────────────────────────

async function errorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  const error = data?.error;
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  return "The server didn't accept this score.";
}

/** Send one score to the server */
export async function sendScore(roundId: string, entry: QueuedScore): Promise<SendResult> {
  const { roundPlayerId, holeNumber, strokes, penalties, putts, fairwayHit, gir } = entry;
  // Age rather than a timestamp: the server works out when it was entered on its own clock
  const enteredMsAgo = Math.max(0, Date.now() - entry.enteredAt);
  const body = { roundPlayerId, holeNumber, strokes, penalties, putts, fairwayHit, gir, enteredMsAgo };
  let res: Response;
  try {
    res = await fetch(`/api/rounds/${roundId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: "offline" };
  }
  if (res.ok) {
    const data = await res.json().catch(() => null);
    return data?.stale && data.score ? { kind: "superseded", score: data.score } : { kind: "sent" };
  }
  if (res.status === 401) return { kind: "signedOut" };
  if (res.status >= 500 || res.status === 408 || res.status === 429) return { kind: "retry" };
  return { kind: "rejected", message: await errorMessage(res) };
}

const flushing = new Map<string, Promise<FlushResult>>();

/**
 * Send every queued score for the round, one at a time. Stops at the first connection problem
 * (the rest stay queued for next time). Only one flush per round runs at once.
 */
export function flushOutbox(roundId: string): Promise<FlushResult> {
  // A send already in progress won't include scores queued since it started, so go again after it
  const running = flushing.get(roundId);
  if (running) return running.then(() => flushOutbox(roundId));

  const run = (async (): Promise<FlushResult> => {
    const result: FlushResult = { sent: 0, offline: false, signedOut: false, rejected: [], superseded: [] };
    const queue = pendingScores(roundId).sort((a, b) => a.holeNumber - b.holeNumber || a.enteredAt - b.enteredAt);
    for (const entry of queue) {
      const outcome = await sendScore(roundId, entry);
      if (outcome.kind === "sent") {
        removeIfUnchanged(roundId, entry);
        result.sent++;
      } else if (outcome.kind === "superseded") {
        removeIfUnchanged(roundId, entry);
        result.superseded.push({ entry, score: outcome.score });
      } else if (outcome.kind === "rejected") {
        removeIfUnchanged(roundId, entry);
        result.rejected.push({ entry, message: outcome.message });
      } else {
        if (outcome.kind === "offline") result.offline = true;
        if (outcome.kind === "signedOut") result.signedOut = true;
        break;
      }
    }
    return result;
  })().finally(() => flushing.delete(roundId));

  flushing.set(roundId, run);
  return run;
}

// ─── Round data for opening the page offline ─────────────────────────────────

/** Keep the latest round data so the score page can open with no signal */
export function cacheRound(roundId: string, data: unknown) {
  if (!write(roundKey(roundId), data)) return;
  const index = (read<string[]>(ROUND_INDEX_KEY) ?? []).filter((r) => r !== roundId);
  index.unshift(roundId);
  for (const old of index.splice(MAX_CACHED_ROUNDS)) {
    // Never drop a round that still has scores waiting to send
    if (pendingScores(old).length > 0) index.push(old);
    else remove(roundKey(old));
  }
  write(ROUND_INDEX_KEY, index);
}

export function cachedRound<T>(roundId: string): T | null {
  return read<T>(roundKey(roundId));
}
