"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import HoleMap from "@/components/HoleMap";
import TournamentLeaderboard from "@/components/tournament/TournamentLeaderboard";
import { useParams, useRouter } from "next/navigation";
import { strokesOnHole, ambroseTeamHandicap, calcMatchPlay, calcSkins, matchPlayAllowances, stablefordPoints } from "@/lib/formats";
import { calcTournamentStandings, formatStandingScore } from "@/lib/tournamentStandings";
import { formatDisplayLabel, isTeamGame } from "@/lib/gameFormats";
import { joinNames } from "@/lib/teams";
import { isHoleInPlay } from "@/lib/nines";
import GuestBadge from "@/components/guests/GuestBadge";
import FullScorecard, { type ScoreColumn } from "@/components/scorecard/FullScorecard";
import { formatMissing, missingScores, type MissingScores } from "@/lib/roundCompletion";
import { isIncompleteTee, type TeeDataIssue } from "@/lib/teeDataIssues";
import { cachedRound, cacheRound, flushOutbox, pendingHoleCount, pendingScores, queueScores, sendScore, type FlushResult, type QueuedScore } from "@/lib/offlineScores";

interface Hole { id: string; number: number; par: number; strokeIndex: number; distance?: number; teeLat?: number | null; teeLng?: number | null; greenLat?: number | null; greenLng?: number | null; }
interface ScoreEntry { strokes: number; penalties: number; putts?: number; fairwayHit?: boolean; gir?: boolean }
interface SavedScore { holeNumber: number; strokes: number; penalties: number; putts: number | null; fairwayHit: boolean | null; gir: boolean | null }
interface Player { id: string; userId: string; playingHandicap: number; teamNumber?: number | null; user: { id: string; name: string; isGuest?: boolean }; scores: SavedScore[] }
interface PrizeHole { holeNumber: number; type: "LONGEST_DRIVE" | "NEAREST_PIN" }
interface Round {
  id: string;
  format: string;
  status: string;
  holesCount: number;
  startingHole: number;
  stablefordTeamSize?: number;
  skinsCarryOver?: boolean;
  course: { name: string };
  tee: { name: string; par: number; dataIssues: TeeDataIssue[]; holes: Hole[] };
  players: Player[];
  prizeHoles?: PrizeHole[];
  tournamentRounds?: { tournament?: { id: string; status: string; prizeHoles?: PrizeHole[] } }[];
}

function scoreBadgeClass(strokes: number, par: number, handicap: number, strokeIndex: number) {
  const net = strokes - strokesOnHole(handicap, strokeIndex);
  const diff = net - par;
  if (diff <= -2) return "score-eagle";
  if (diff === -1) return "score-birdie";
  if (diff === 0) return "score-par";
  if (diff === 1) return "score-bogey";
  return "score-double";
}

/** "+1 shot", "+2 shots", or for a plus handicap "gives 1 back" */
function shotsLabel(shots: number) {
  if (shots < 0) return `gives ${-shots} back`;
  return `+${shots} shot${shots !== 1 ? "s" : ""}`;
}

/** Holes in play for the round, in playing order */
function holesInPlay(round: Round): Hole[] {
  return round.tee.holes.filter((h) => isHoleInPlay(h.number, round.holesCount, round.startingHole));
}

interface TeamScoreCardProps {
  teamNumber: number;
  memberNames: string;
  strokes: number;
  teamHandicap: number;
  holePar: number;
  holeStrokeIndex: number;
  /** Team Stableford: show the team's points for this hole */
  stableford?: boolean;
  onChange: (strokes: number) => void;
}

function TeamScoreCard({ teamNumber, memberNames, strokes, teamHandicap, holePar, holeStrokeIndex, stableford, onChange }: TeamScoreCardProps) {
  const handi = strokesOnHole(teamHandicap, holeStrokeIndex);
  const netPar = holePar + handi;
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-fairway-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-fairway-900">Team {teamNumber}</p>
          <p className="text-xs text-gray-500">{memberNames}</p>
          <p className="text-sm font-medium text-fairway-700 mt-0.5">
            Team Hcap {teamHandicap}
            <span className="mx-1.5 text-fairway-300">·</span>
            {shotsLabel(handi)}
            <span className="mx-1.5 text-fairway-300">·</span>
            Net par {netPar}
          </p>
        </div>
        {strokes > 0 && (
          <div className="flex flex-col items-center gap-0.5">
            <span className={`w-9 h-9 flex items-center justify-center font-bold text-sm ${scoreBadgeClass(strokes, holePar, teamHandicap, holeStrokeIndex)}`}>
              {strokes}
            </span>
            {stableford && (
              <span className="text-xs font-semibold text-fairway-700">
                {stablefordPoints(strokes - handi, holePar)} pts
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(1, strokes - 1))}
          className="w-10 h-10 rounded-full bg-fairway-100 text-fairway-800 font-bold text-lg hover:bg-fairway-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <span className="text-3xl font-bold text-fairway-900">{strokes || "—"}</span>
          <p className="text-xs text-gray-400">team strokes</p>
          <p className="text-[11px] text-gray-400">Best ball each shot — enter the team&apos;s score</p>
        </div>
        <button
          onClick={() => onChange(strokes + 1)}
          className="w-10 h-10 rounded-full bg-fairway-700 text-white font-bold text-lg hover:bg-fairway-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface ScoreAccessInfo { canEdit: boolean; locked: boolean; isOrganiser: boolean; isAdmin?: boolean }

export default function ScoringPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [round, setRound] = useState<Round | null>(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [scores, setScores] = useState<Record<string, Record<number, ScoreEntry>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Finish Round was tapped with holes still to score — who's missing what
  const [missing, setMissing] = useState<MissingScores[] | null>(null);
  const [tab, setTab] = useState<"score" | "card" | "leaderboard">("score");
  const firstLoadRef = useRef(true);
  const [popupDismissedForHole, setPopupDismissedForHole] = useState<number | null>(null);
  // Whether this viewer may enter scores (players, or the event organiser; players are shut out once scores are locked)
  const [access, setAccess] = useState<ScoreAccessInfo | null>(null);
  // Offline scoring: holes saved on this phone but not yet sent, and whether the last request had no signal
  const [pendingHoles, setPendingHoles] = useState(0);
  const [offline, setOffline] = useState(false);
  const roundRef = useRef<Round | null>(null);
  // Scores changed on this phone since the last Save ("playerId:hole"). Only these are sent, and only
  // these keep their local value when the server's copy arrives — everything else shows the server's.
  const dirtyRef = useRef(new Set<string>());
  // Bumped whenever the server's scores change from here, so an older in-flight load can be ignored
  const sendSeqRef = useRef(0);
  // Info (not an error): a teammate's newer score was kept instead of this phone's
  const [notice, setNotice] = useState("");

  const applyRoundData = useCallback((data: { round?: Round; access?: ScoreAccessInfo | null }) => {
    if (data.access) setAccess(data.access);
    if (data.round) {
      roundRef.current = data.round;
      // Flatten prize holes from the tournament relation onto the round
      data.round.prizeHoles =
        data.round.tournamentRounds?.[0]?.tournament?.prizeHoles ?? [];
      setRound(data.round);
      const existing: typeof scores = {};
      for (const player of data.round.players) {
        existing[player.id] = {};
        for (const s of player.scores) {
          existing[player.id][s.holeNumber] = {
            strokes: s.strokes,
            penalties: s.penalties,
            putts: s.putts ?? undefined,
            fairwayHit: s.fairwayHit ?? undefined,
            gir: s.gir ?? undefined,
          };
        }
      }
      // Scores saved on this phone but not sent yet win over the server's copy
      for (const q of pendingScores(data.round.id)) {
        if (!existing[q.roundPlayerId]) continue;
        existing[q.roundPlayerId][q.holeNumber] = {
          strokes: q.strokes,
          penalties: q.penalties,
          putts: q.putts,
          fairwayHit: q.fairwayHit,
          gir: q.gir,
        };
      }
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        const loaded = data.round;
        const nextHole = holesInPlay(loaded).find((h) =>
          !loaded.players.every((p: Player) => (existing[p.id]?.[h.number]?.strokes ?? 0) > 0)
        );
        if (nextHole) setCurrentHole(nextHole.number);
      }
      // The server's copy wins, except for edits on this phone that haven't been saved yet
      setScores((prev) => {
        const merged = { ...existing };
        for (const key of dirtyRef.current) {
          const [pid, hole] = key.split(":");
          const local = prev[pid]?.[Number(hole)];
          if (local && merged[pid]) merged[pid] = { ...merged[pid], [Number(hole)]: local };
        }
        return merged;
      });
    }
  }, []);

  /** Load the round. With no signal, fall back to the copy kept on this phone. */
  const fetchRound = useCallback(() => {
    const seq = sendSeqRef.current;
    return fetch(`/api/rounds/${id}/score`)
        .then(async (res) => {
          const data = await res.json();
          setOffline(false);
          // Scores were sent while this was loading, so it's out of date — the next load will catch up
          if (seq !== sendSeqRef.current && roundRef.current) return;
          if (res.ok) cacheRound(id, data);
          applyRoundData(data);
        })
        .catch(() => {
          setOffline(true);
          if (!roundRef.current) {
            const saved = cachedRound<{ round?: Round; access?: ScoreAccessInfo | null }>(id);
            if (saved) applyRoundData(saved);
          }
        });
  }, [id, applyRoundData]);

  /** Show the score that was kept when a teammate's newer score beat this phone's */
  const applySuperseded = useCallback((superseded: FlushResult["superseded"]) => {
    if (superseded.length === 0) return;
    setScores((prev) => {
      const next = { ...prev };
      for (const { score: s } of superseded) {
        next[s.roundPlayerId] = {
          ...(next[s.roundPlayerId] ?? {}),
          [s.holeNumber]: {
            strokes: s.strokes,
            penalties: s.penalties,
            putts: s.putts ?? undefined,
            fairwayHit: s.fairwayHit ?? undefined,
            gir: s.gir ?? undefined,
          },
        };
      }
      return next;
    });
    const names = new Map(roundRef.current?.players.map((p) => [p.id, p.user.name.split(" ")[0]]) ?? []);
    setNotice(
      superseded
        .map(({ score: s }) => `Hole ${s.holeNumber}${names.has(s.roundPlayerId) ? ` (${names.get(s.roundPlayerId)})` : ""}: kept ${s.strokes}, a newer score from another phone.`)
        .join(" ")
    );
  }, []);

  /** Show why a queued score was refused for good (e.g. the event's scores were locked) */
  const describeRejections = useCallback((rejected: FlushResult["rejected"]) => {
    const names = new Map(roundRef.current?.players.map((p) => [p.id, p.user.name.split(" ")[0]]) ?? []);
    return rejected
      .map(({ entry, message }) => `Hole ${entry.holeNumber}${names.has(entry.roundPlayerId) ? ` (${names.get(entry.roundPlayerId)})` : ""} wasn't saved: ${message}`)
      .join(" ");
  }, []);

  /** Send any scores saved on this phone. Safe to call often — only one send runs at a time. */
  const syncScores = useCallback(
    (): Promise<FlushResult> =>
      flushOutbox(id).then((result) => {
        if (result.sent > 0 || result.superseded.length > 0) sendSeqRef.current++;
        setPendingHoles(pendingHoleCount(id));
        applySuperseded(result.superseded);
        if (result.sent > 0 || result.rejected.length > 0 || result.superseded.length > 0) setOffline(false);
        if (result.offline) setOffline(true);
        if (result.rejected.length > 0) setSaveError(describeRejections(result.rejected));
        else if (result.signedOut) setSaveError("You've been signed out — sign in again to send the scores saved on this phone.");
        return result;
      }),
    [id, describeRejections, applySuperseded]
  );

  // Send anything left over from last time first, so the loaded round includes it
  useEffect(() => {
    syncScores().finally(fetchRound);
  }, [syncScores, fetchRound]);

  // Keep a copy of this page so it can be reopened with no signal (the service worker caches it)
  useEffect(() => {
    if (!navigator.serviceWorker?.controller) return;
    fetch(window.location.pathname).catch(() => { /* offline — nothing to cache */ });
  }, []);

  // Send queued scores as soon as signal returns or the app comes back to the foreground
  useEffect(() => {
    const onOnline = () => { syncScores().finally(fetchRound); };
    const onOffline = () => setOffline(true);
    const onVisible = () => { if (!document.hidden) onOnline(); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncScores, fetchRound]);

  // Every 10s while the tab is visible: send queued scores, then pull live updates (in play only)
  const isComplete = round?.status === "COMPLETE";
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      syncScores().finally(() => { if (!isComplete) fetchRound(); });
    }, 10000);
    return () => clearInterval(interval);
  }, [syncScores, fetchRound, isComplete]);

  // Show prize hole popup when on a designated hole (unless already dismissed)
  const prizeHolePopup = popupDismissedForHole === currentHole
    ? null
    : round?.prizeHoles?.find((p) => p.holeNumber === currentHole) ?? null;

  // Moving to another hole clears the dismissed flag so the popup shows again on return
  function changeHole(next: number | ((h: number) => number)) {
    setCurrentHole(next);
    setMissing(null);
    setPopupDismissedForHole(null);
  }

  function updateScore(roundPlayerId: string, holeNumber: number, field: keyof ScoreEntry, value: number | boolean) {
    setMissing(null);
    dirtyRef.current.add(`${roundPlayerId}:${holeNumber}`);
    setScores((prev) => ({
      ...prev,
      [roundPlayerId]: {
        ...(prev[roundPlayerId] ?? {}),
        [holeNumber]: {
          ...(prev[roundPlayerId]?.[holeNumber] ?? { strokes: 0, penalties: 0 }),
          [field]: value,
        },
      },
    }));
  }

  function updateTeamScore(teamNumber: number, holeNumber: number, strokes: number) {
    setMissing(null);
    for (const player of round!.players) {
      if ((player.teamNumber ?? 0) === teamNumber) dirtyRef.current.add(`${player.id}:${holeNumber}`);
    }
    setScores((prev) => {
      const next = { ...prev };
      for (const player of round!.players) {
        if ((player.teamNumber ?? 0) === teamNumber) {
          next[player.id] = {
            ...(next[player.id] ?? {}),
            [holeNumber]: { strokes, penalties: 0 },
          };
        }
      }
      return next;
    });
  }

  /**
   * Save the current hole's changed scores. Scores are kept on this phone first, then sent; with
   * no signal they stay queued and send automatically later, so the player can carry on.
   * Unchanged scores aren't re-sent, so tapping Save can't overwrite a teammate's newer correction.
   * Returns false (and shows an error) only if the server refused a score.
   */
  async function saveHole(): Promise<boolean> {
    if (!round) return false;
    setSaving(true);
    setSaveError("");
    setNotice("");
    const hole = round.tee.holes.find((h) => h.number === currentHole);
    if (!hole) { setSaving(false); return false; }

    const enteredAt = Date.now();
    const entries: QueuedScore[] = round.players.flatMap((player) => {
      const s = scores[player.id]?.[currentHole];
      if (!s || s.strokes < 1 || !dirtyRef.current.has(`${player.id}:${currentHole}`)) return [];
      return [{
        roundPlayerId: player.id,
        holeNumber: currentHole,
        strokes: s.strokes,
        penalties: s.penalties ?? 0,
        putts: s.putts,
        fairwayHit: s.fairwayHit,
        gir: s.gir,
        enteredAt,
      }];
    });

    const clearDirty = (list: QueuedScore[]) => list.forEach((e) => dirtyRef.current.delete(`${e.roundPlayerId}:${e.holeNumber}`));

    if (!queueScores(id, entries)) {
      // Storage unavailable (e.g. a private window): send directly, as before
      const results = await Promise.all(entries.map((e) => sendScore(id, e)));
      setSaving(false);
      clearDirty(entries.filter((_, i) => results[i].kind === "sent" || results[i].kind === "superseded"));
      if (results.some((r) => r.kind === "sent" || r.kind === "superseded")) sendSeqRef.current++;
      applySuperseded(results.flatMap((r, i) => (r.kind === "superseded" ? [{ entry: entries[i], score: r.score }] : [])));
      const rejected = results.flatMap((r, i) => (r.kind === "rejected" ? [{ entry: entries[i], message: r.message }] : []));
      if (rejected.length > 0) { setSaveError(describeRejections(rejected)); return false; }
      if (results.some((r) => r.kind !== "sent" && r.kind !== "superseded")) {
        setSaveError(`No connection — hole ${currentHole} isn't saved yet. Try again when you have signal.`);
        return false;
      }
      return true;
    }

    // Queued on the phone now — the queue keeps them until the server has them
    clearDirty(entries);
    const result = await syncScores();
    setSaving(false);
    return !result.rejected.some((r) => r.entry.holeNumber === currentHole);
  }

  async function saveAndNext() {
    if (!round) return;
    const ok = await saveHole();
    if (ok && currentHole < lastHoleNumber) changeHole((h) => h + 1);
  }

  async function finishRound() {
    if (!round || !(await saveHole())) return;
    const waiting = pendingHoleCount(id);
    if (waiting > 0) {
      setSaveError(`${waiting} hole${waiting === 1 ? " is" : "s are"} still waiting to send — finish the round when you have signal.`);
      return;
    }
    if (round.status !== "COMPLETE") {
      // Every card must be complete first (the server enforces this too)
      const stillMissing = missingScores({
        format: round.format,
        stablefordTeamSize: round.stablefordTeamSize,
        holes: holesInPlay(round),
        players: round.players.map((p) => ({
          name: p.user.name,
          playingHandicap: p.playingHandicap,
          teamNumber: p.teamNumber ?? null,
          scores: new Map(Object.entries(scores[p.id] ?? {}).map(([hole, s]) => [Number(hole), s.strokes])),
        })),
      });
      if (stillMissing.length > 0) {
        setMissing(stillMissing);
        return;
      }
      const res = await fetch(`/api/rounds/${id}/complete`, { method: "POST" }).catch(() => null);
      if (!res?.ok) {
        const data = res ? await res.json().catch(() => null) : null;
        // A 409 lists holes another phone hasn't saved yet
        if (Array.isArray(data?.error?.missing)) setMissing(data.error.missing);
        else setSaveError(typeof data?.error?.message === "string" ? data.error.message : typeof data?.error === "string" ? data.error : res ? "Couldn't finish the round — please try again." : "No connection — couldn't finish the round.");
        return;
      }
    }
    router.push(`/rounds/${id}/summary`);
  }

  function dismissPrizeHolePopup() {
    setPopupDismissedForHole(currentHole);
  }

  if (!round) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <p className="text-gray-400">
          {offline ? "No signal — this round can't load until you're back in coverage." : "Loading scorecard…"}
        </p>
      </div>
    );
  }

  // Can't enter scores here: the event's scores are locked, or the viewer isn't in this group
  if (access && !access.canEdit) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="bg-fairway-900 text-white rounded-2xl px-4 py-3">
          <p className="font-bold">{round.course.name}</p>
          <p className="text-fairway-300 text-xs">{round.tee.name} tees · {formatDisplayLabel(round.format, round.stablefordTeamSize)}</p>
        </div>
        <div role="status" className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 text-sm text-gray-700">
          <p className="font-semibold text-fairway-900">
            {access.locked ? "🔒 Scores are locked by the organiser" : "Only this group's players can enter its scores"}
          </p>
          <p>
            {access.locked
              ? "The event is finished and its scores can no longer be changed. Contact the organiser if something needs fixing."
              : "You can follow along on the event leaderboard or view the round summary."}
          </p>
          <Link
            href={`/rounds/${id}/summary`}
            className="inline-block px-3 py-2 bg-fairway-700 text-white rounded-lg text-sm font-semibold hover:bg-fairway-800 active:bg-fairway-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-2"
          >
            View summary →
          </Link>
        </div>
      </div>
    );
  }

  const holes = holesInPlay(round);
  const hole = holes.find((h) => h.number === currentHole);
  const lastHoleNumber = holes[holes.length - 1]?.number ?? 18;
  // Team games (Ambrose, 2-/4-ball Stableford) are scrambles: one team score per hole
  const isTeam = isTeamGame(round.format, round.stablefordTeamSize);
  const tournament = round.tournamentRounds?.[0]?.tournament;

  // Group players by teamNumber for Ambrose; each entry has teamNumber + sorted members
  const teams = isTeam
    ? [...new Set(round.players.map((p) => p.teamNumber ?? 0))].sort((a, b) => a - b).map((tn) => ({
        teamNumber: tn,
        members: round.players.filter((p) => (p.teamNumber ?? 0) === tn),
      }))
    : [];

  const allEntered = isTeam
    ? teams.every((team) => (scores[team.members[0]?.id]?.[currentHole]?.strokes ?? 0) > 0)
    : round.players.every((p) => (scores[p.id]?.[currentHole]?.strokes ?? 0) > 0);

  // Live group leaderboard for casual rounds (tournament rounds use TournamentLeaderboard) —
  // computed by the same lib as event standings, from the scores entered so far.
  const enteredScores = (playerId: string) =>
    holes.flatMap((h) => {
      const strokes = scores[playerId]?.[h.number]?.strokes ?? 0;
      return strokes > 0 ? [{ holeNumber: h.number, strokes }] : [];
    });
  const leaderboard = calcTournamentStandings(
    [{
      roundNumber: 1,
      round: {
        id: round.id,
        stablefordTeamSize: round.stablefordTeamSize,
        tee: { holes },
        players: round.players.map((p) => ({
          playingHandicap: p.playingHandicap,
          teamNumber: p.teamNumber ?? null,
          user: p.user,
          scores: enteredScores(p.id),
        })),
      },
    }],
    round.format,
    false
  );

  // Match Play strokes per player (the handicap difference goes to the higher handicap)
  const matchAllowance = new Map<string, number>();
  if (round.format === "MATCH_PLAY" && round.players.length === 2) {
    const [a, b] = round.players;
    const [sa, sb] = matchPlayAllowances(a.playingHandicap, b.playingHandicap);
    matchAllowance.set(a.id, sa).set(b.id, sb);
  }

  const match = round.format === "MATCH_PLAY" && round.players.length === 2
    ? calcMatchPlay(
        ...(round.players.map((p) => ({
          playerId: p.id,
          name: p.user.name,
          playingHandicap: p.playingHandicap,
          holes: holes.map((h) => ({
            holeNumber: h.number,
            par: h.par,
            strokeIndex: h.strokeIndex,
            strokes: scores[p.id]?.[h.number]?.strokes ?? 0,
          })),
        })) as [Parameters<typeof calcMatchPlay>[0], Parameters<typeof calcMatchPlay>[1]]),
        holes.length
      )
    : null;

  // Full card: built from local scores so it includes unsaved entries and live updates
  const cardColumns: ScoreColumn[] = isTeam
    ? teams.map((team) => ({
        key: `team-${team.teamNumber}`,
        label: joinNames(team.members.map((m) => m.user.name.split(" ")[0])),
        sub: `Team ${team.teamNumber}`,
        strokes: (n) => scores[team.members[0]?.id]?.[n]?.strokes || undefined,
      }))
    : round.players.map((p) => ({
        key: p.id,
        label: p.user.name.split(" ")[0],
        guest: p.user.isGuest,
        playerId: p.id,
        strokes: (n) => scores[p.id]?.[n]?.strokes || undefined,
      }));
  const matchHoleLabel = (holeNumber: number) => {
    const result = match?.holes.find((h) => h.holeNumber === holeNumber)?.result;
    if (!result) return "—";
    if (result === "halved") return "½";
    return round.players[result === "player1" ? 0 : 1].user.name.split(" ")[0];
  };
  const skinWins = new Map<number, { winnerId: string; value: number }>();
  if (round.format === "SKINS") {
    const skins = calcSkins(
      round.players.map((p) => ({
        playerId: p.id,
        name: p.user.name,
        playingHandicap: p.playingHandicap,
        holes: holes.map((h) => ({
          holeNumber: h.number,
          par: h.par,
          strokeIndex: h.strokeIndex,
          strokes: scores[p.id]?.[h.number]?.strokes ?? 0,
        })),
      })),
      { carryOver: round.skinsCarryOver }
    );
    for (const skin of skins.skins) {
      if (skin.winnerId) skinWins.set(skin.holeNumber, { winnerId: skin.winnerId, value: skin.value });
    }
  }

  const tabs = [
    { id: "score", label: "Enter Scores" },
    { id: "card", label: "View Card" },
    { id: "leaderboard", label: "Leaderboard" },
  ] as const;

  return (
    <div className="space-y-4 max-w-xl">
      {/* Header */}
      <div className="bg-fairway-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold">{round.course.name}</p>
          <p className="text-fairway-300 text-xs">{round.tee.name} tees · {formatDisplayLabel(round.format, round.stablefordTeamSize)}</p>
          {isIncompleteTee(round.tee) && (
            <p className="text-xs text-amber-300 mt-0.5">Incomplete course data — not counted for handicap</p>
          )}
          {access?.isAdmin ? (
            <p className="text-xs text-acorn-400 mt-0.5">
              Admin edit{access.locked ? " — scores are locked for players" : ""} · recorded in the audit log
            </p>
          ) : round.status === "COMPLETE" && (
            <p className="text-xs text-acorn-400 mt-0.5">
              {access?.locked ? "Organiser edit — scores are locked for players" : "Editing saved round"}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{currentHole}<span className="text-fairway-400 text-base">/{lastHoleNumber}</span></p>
          <p className="text-fairway-300 text-xs">hole</p>
        </div>
      </div>

      {/* Offline status — always mounted so screen readers announce changes */}
      <div role="status" aria-live="polite">
        {(pendingHoles > 0 || (offline && round.status !== "COMPLETE")) && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {pendingHoles > 0
              ? `${offline ? "No signal · " : ""}${pendingHoles} hole${pendingHoles === 1 ? "" : "s"} saved on this phone — they'll send automatically.`
              : "No signal — keep scoring, your holes are saved on this phone."}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Round views" className="flex gap-1 bg-fairway-100 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 focus-visible:ring-offset-1 ${
              tab === t.id
                ? "bg-fairway-700 text-white font-semibold shadow-sm"
                : "text-fairway-800 font-medium hover:bg-fairway-200 active:bg-fairway-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "card" && (
        <FullScorecard
          holes={holes}
          columns={cardColumns}
          skinWins={skinWins}
          matchHoleLabel={match ? matchHoleLabel : undefined}
          showSkinsLegend={round.format === "SKINS"}
          skinsCarryOver={round.skinsCarryOver}
          currentHole={currentHole}
          onHoleClick={(n) => {
            changeHole(n);
            setTab("score");
          }}
        />
      )}

      {tab === "score" && hole && (
        <div className="space-y-4">
          {/* Hole info */}
          <div className="bg-fairway-700 text-white rounded-xl px-4 py-3">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold">Hole {hole.number}</p>
              <p className="text-3xl font-bold text-fairway-200">Par {hole.par}</p>
              {hole.distance && <p className="text-3xl font-bold text-fairway-200">{hole.distance}m</p>}
            </div>
            <div className="mt-1 text-sm text-fairway-300">
              <span>SI: {hole.strokeIndex}</span>
            </div>
          </div>

          {/* Score entry — one card per team for Ambrose, one per player otherwise */}
          {isTeam
            ? teams.map((team) => {
                const phs = team.members.map((m) => m.playingHandicap);
                const teamHCP = ambroseTeamHandicap(phs);
                const memberNames = joinNames(team.members.map((m) => m.user.name));
                const rep = team.members[0];
                const strokes = scores[rep?.id]?.[currentHole]?.strokes ?? 0;
                return (
                  <TeamScoreCard
                    key={team.teamNumber}
                    teamNumber={team.teamNumber}
                    memberNames={memberNames}
                    strokes={strokes}
                    teamHandicap={teamHCP}
                    holePar={hole.par}
                    holeStrokeIndex={hole.strokeIndex}
                    stableford={round.format === "STABLEFORD"}
                    onChange={(s) => updateTeamScore(team.teamNumber, currentHole, s)}
                  />
                );
              })
            : round.players.map((player) => {
                const s = scores[player.id]?.[currentHole] ?? { strokes: 0, penalties: 0 };
                // Match Play: the higher handicap receives the difference; otherwise the full handicap
                const allowance = matchAllowance.get(player.id) ?? player.playingHandicap;
                const handi = strokesOnHole(allowance, hole.strokeIndex);
                const netPar = hole.par + handi;
                return (
                  <div key={player.id} className="bg-white rounded-xl p-4 shadow-sm border border-fairway-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-fairway-900">
                          {player.user.name}
                          {player.user.isGuest && <GuestBadge className="ml-2" />}
                        </p>
                        <p className="text-sm font-medium text-fairway-700 mt-0.5">
                          Hcap {player.playingHandicap}
                          {matchAllowance.size > 0 && ` (plays off ${allowance})`}
                          <span className="mx-1.5 text-fairway-300">·</span>
                          {shotsLabel(handi)}
                          <span className="mx-1.5 text-fairway-300">·</span>
                          Net par {netPar}
                        </p>
                      </div>
                      {s.strokes > 0 && (
                        <span className={`w-9 h-9 flex items-center justify-center font-bold text-sm ${scoreBadgeClass(s.strokes, hole.par, allowance, hole.strokeIndex)}`}>
                          {s.strokes}
                        </span>
                      )}
                    </div>

                    {/* Stroke counter */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateScore(player.id, currentHole, "strokes", Math.max(1, (s.strokes || 1) - 1))}
                        className="w-10 h-10 rounded-full bg-fairway-100 text-fairway-800 font-bold text-lg hover:bg-fairway-200 transition-colors"
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-bold text-fairway-900">{s.strokes || "—"}</span>
                        <p className="text-xs text-gray-400">strokes</p>
                      </div>
                      <button
                        onClick={() => updateScore(player.id, currentHole, "strokes", (s.strokes || 0) + 1)}
                        className="w-10 h-10 rounded-full bg-fairway-700 text-white font-bold text-lg hover:bg-fairway-800 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="mt-3 flex gap-3 text-xs">
                      {hole.par > 3 && (
                        <button
                          onClick={() => updateScore(player.id, currentHole, "fairwayHit", !s.fairwayHit)}
                          className={`px-2 py-1 rounded-lg border transition-colors ${s.fairwayHit ? "bg-fairway-600 text-white border-fairway-600" : "border-gray-200 text-gray-500"}`}
                        >
                          FIR
                        </button>
                      )}
                      <button
                        onClick={() => updateScore(player.id, currentHole, "gir", !s.gir)}
                        className={`px-2 py-1 rounded-lg border transition-colors ${s.gir ? "bg-fairway-600 text-white border-fairway-600" : "border-gray-200 text-gray-500"}`}
                      >
                        GIR
                      </button>
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => updateScore(player.id, currentHole, "putts", Math.max(0, (s.putts ?? 2) - 1))}
                          className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                        >−</button>
                        <span className="text-gray-600 w-4 text-center">{s.putts ?? "—"}</span>
                        <button
                          onClick={() => updateScore(player.id, currentHole, "putts", (s.putts ?? 1) + 1)}
                          className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                        >+</button>
                        <span className="text-gray-400 ml-1">putts</span>
                      </div>
                    </div>
                  </div>
                );
              })
          }

          {/* Hole map */}
          <HoleMap hole={hole} />

          {/* Hole navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => changeHole((h) => Math.max(holes[0]?.number ?? 1, h - 1))}
              disabled={currentHole === (holes[0]?.number ?? 1)}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ← Hole {Math.max(holes[0]?.number ?? 1, currentHole - 1)}
            </button>
            {currentHole !== lastHoleNumber && round.status !== "COMPLETE" && (
              <button
                onClick={saveAndNext}
                disabled={saving || !allEntered}
                className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving…" : `Save & Hole ${currentHole + 1} →`}
              </button>
            )}
          </div>

          {missing && missing.length > 0 && (
            <div role="alert" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 space-y-2">
              <p>
                <span className="font-semibold">Scores missing</span> — enter every hole before finishing the round.
              </p>
              <p className="text-amber-800">{formatMissing(missing)}</p>
              <button
                onClick={() => changeHole(Math.min(...missing.flatMap((m) => m.holes)))}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 active:bg-amber-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                Go to hole {Math.min(...missing.flatMap((m) => m.holes))}
              </button>
            </div>
          )}

          {saveError && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {saveError}
            </p>
          )}

          {notice && (
            <p role="status" className="text-sm text-fairway-900 bg-fairway-50 border border-fairway-200 rounded-xl px-3 py-2">
              {notice}
            </p>
          )}

          {(currentHole === lastHoleNumber || round.status === "COMPLETE") && (
            <button
              onClick={finishRound}
              disabled={saving}
              className="w-full py-3 bg-acorn-700 text-white rounded-xl font-semibold hover:bg-acorn-900 transition-colors"
            >
              {round.status === "COMPLETE" ? "✓ Save & Return to Summary" : "🏁 Finish Round"}
            </button>
          )}

          {/* Hole dots */}
          <div className="flex gap-1 justify-center flex-wrap">
            {holes.map((h) => {
              const entered = isTeam
                ? teams.every((team) => (scores[team.members[0]?.id]?.[h.number]?.strokes ?? 0) > 0)
                : round.players.every((p) => (scores[p.id]?.[h.number]?.strokes ?? 0) > 0);
              return (
                <button
                  key={h.number}
                  onClick={() => changeHole(h.number)}
                  className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                    h.number === currentHole
                      ? "bg-fairway-700 text-white"
                      : entered
                      ? "bg-fairway-200 text-fairway-800"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {h.number}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "leaderboard" && tournament && (
        <div className="space-y-2">
          <h2 className="font-semibold text-fairway-800 mb-3">Tournament Leaderboard</h2>
          <TournamentLeaderboard
            tournamentId={tournament.id}
            format={round.format}
            isActive={tournament.status !== "COMPLETE"}
            highlightRoundId={round.id}
          />
        </div>
      )}

      {tab === "leaderboard" && !tournament && (
        <div className="space-y-2">
          <h2 className="font-semibold text-fairway-800 mb-3">Live Leaderboard</h2>
          {match && (
            <div className="bg-acorn-50 border border-acorn-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-acorn-700">Match</p>
              <p className="text-lg font-bold text-acorn-900">{match.status}</p>
            </div>
          )}
          {leaderboard.map((entry, i) => (
            <div
              key={entry.playerId}
              className={`flex items-center gap-3 p-4 rounded-xl ${i === 0 ? "bg-fairway-900 text-white" : "bg-white border border-fairway-50"}`}
            >
              <span className={`text-lg font-bold w-6 ${i === 0 ? "text-fairway-300" : "text-gray-400"}`}>{i + 1}</span>
              <div className="flex-1">
                <p className={`font-semibold ${i === 0 ? "text-white" : "text-fairway-900"}`}>{entry.name}</p>
                {entry.subName && isTeam && (
                  <p className={`text-xs ${i === 0 ? "text-fairway-400" : "text-gray-400"}`}>{entry.subName}</p>
                )}
                <p className={`text-xs ${i === 0 ? "text-fairway-300" : "text-gray-400"}`}>
                  {entry.holesPlayed} hole{entry.holesPlayed !== 1 ? "s" : ""} played
                </p>
              </div>
              <span className={`text-xl font-bold ${i === 0 ? "text-fairway-300" : "text-fairway-700"}`}>
                {formatStandingScore(entry.score, round.format)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Prize Hole Popup */}
      {prizeHolePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={dismissPrizeHolePopup} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="text-4xl">
              {prizeHolePopup.type === "LONGEST_DRIVE" ? "🏌️" : "🎯"}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fairway-500 mb-1">Prize Hole</p>
              <h2 className="text-xl font-bold text-fairway-900">
                {prizeHolePopup.type === "LONGEST_DRIVE" ? "Longest Drive" : "Nearest to Pin"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Hole {prizeHolePopup.holeNumber}</p>
            </div>
            <button
              onClick={dismissPrizeHolePopup}
              className="w-full py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
