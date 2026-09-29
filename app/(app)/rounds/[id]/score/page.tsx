"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import HoleMap from "@/components/HoleMap";
import TournamentLeaderboard from "@/components/tournament/TournamentLeaderboard";
import { useParams, useRouter } from "next/navigation";

interface Hole { id: string; number: number; par: number; strokeIndex: number; distance?: number; teeLat?: number | null; teeLng?: number | null; greenLat?: number | null; greenLng?: number | null; }
interface ScoreEntry { strokes: number; penalties: number; putts?: number; fairwayHit?: boolean; gir?: boolean }
interface Player { id: string; userId: string; playingHandicap: number; teamNumber?: number | null; user: { id: string; name: string }; scores: { holeNumber: number; strokes: number }[] }
interface PrizeHole { holeNumber: number; type: "LONGEST_DRIVE" | "NEAREST_PIN" }
interface Round {
  id: string;
  format: string;
  status: string;
  holesCount: number;
  startingHole: number;
  course: { name: string };
  tee: { name: string; par: number; holes: Hole[] };
  players: Player[];
  prizeHoles?: PrizeHole[];
  tournamentRounds?: { tournament?: { id: string; status: string; prizeHoles?: PrizeHole[] } }[];
}

function strokesReceived(handicap: number, strokeIndex: number) {
  if (handicap <= 0) return 0;
  const full = Math.floor(handicap / 18);
  const extra = handicap % 18;
  return full + (strokeIndex <= extra ? 1 : 0);
}

function stablefordPoints(strokes: number, par: number, handicap: number, strokeIndex: number): number {
  const net = strokes - strokesReceived(handicap, strokeIndex);
  const diff = net - par;
  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

function scoreBadgeClass(strokes: number, par: number, handicap: number, strokeIndex: number) {
  const net = strokes - strokesReceived(handicap, strokeIndex);
  const diff = net - par;
  if (diff <= -2) return "score-eagle";
  if (diff === -1) return "score-birdie";
  if (diff === 0) return "score-par";
  if (diff === 1) return "score-bogey";
  return "score-double";
}

function ambroseTeamHandicap(format: string, phs: number[]): number {
  const divisor = format === "AMBROSE_2" ? 4 : 8;
  return Math.round(phs.reduce((a, b) => a + b, 0) / divisor);
}

interface TeamScoreCardProps {
  teamNumber: number;
  memberNames: string;
  strokes: number;
  teamHandicap: number;
  holePar: number;
  holeStrokeIndex: number;
  onChange: (strokes: number) => void;
}

function TeamScoreCard({ teamNumber, memberNames, strokes, teamHandicap, holePar, holeStrokeIndex, onChange }: TeamScoreCardProps) {
  const handi = strokesReceived(teamHandicap, holeStrokeIndex);
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
            +{handi} shot{handi !== 1 ? "s" : ""}
            <span className="mx-1.5 text-fairway-300">·</span>
            Net par {netPar}
          </p>
        </div>
        {strokes > 0 && (
          <span className={`w-9 h-9 flex items-center justify-center font-bold text-sm ${scoreBadgeClass(strokes, holePar, teamHandicap, holeStrokeIndex)}`}>
            {strokes}
          </span>
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

export default function ScoringPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [round, setRound] = useState<Round | null>(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [scores, setScores] = useState<Record<string, Record<number, ScoreEntry>>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"score" | "leaderboard">("score");
  const firstLoadRef = useRef(true);
  const [popupDismissedForHole, setPopupDismissedForHole] = useState<number | null>(null);

  const applyRoundData = useCallback((data: { round?: Round }) => {
    if (data.round) {
      // Flatten prize holes from the tournament relation onto the round
      data.round.prizeHoles =
        data.round.tournamentRounds?.[0]?.tournament?.prizeHoles ?? [];
      setRound(data.round);
      const existing: typeof scores = {};
      for (const player of data.round.players) {
        existing[player.id] = {};
        for (const s of player.scores) {
          existing[player.id][s.holeNumber] = { strokes: s.strokes, penalties: 0 };
        }
      }
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        const loaded = data.round;
        const holes: Hole[] = loaded.tee.holes.slice(
          loaded.startingHole - 1,
          loaded.startingHole - 1 + loaded.holesCount
        );
        const nextHole = holes.find((h) =>
          !loaded.players.every((p: Player) => (existing[p.id]?.[h.number]?.strokes ?? 0) > 0)
        );
        if (nextHole) setCurrentHole(nextHole.number);
      }
      setScores((prev) => {
        const merged = { ...existing };
        for (const pid of Object.keys(prev)) {
          merged[pid] = { ...existing[pid], ...prev[pid] };
        }
        return merged;
      });
    }
  }, []);

  const fetchRound = useCallback(
    () => fetch(`/api/rounds/${id}/score`).then((r) => r.json()).then(applyRoundData),
    [id, applyRoundData]
  );

  useEffect(() => { fetchRound(); }, [fetchRound]);

  // Poll for live updates every 10s
  useEffect(() => {
    const interval = setInterval(fetchRound, 10000);
    return () => clearInterval(interval);
  }, [fetchRound]);

  // Show prize hole popup when on a designated hole (unless already dismissed)
  const prizeHolePopup = popupDismissedForHole === currentHole
    ? null
    : round?.prizeHoles?.find((p) => p.holeNumber === currentHole) ?? null;

  // Moving to another hole clears the dismissed flag so the popup shows again on return
  function changeHole(next: number | ((h: number) => number)) {
    setCurrentHole(next);
    setPopupDismissedForHole(null);
  }

  function updateScore(roundPlayerId: string, holeNumber: number, field: keyof ScoreEntry, value: number | boolean) {
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

  async function saveHole() {
    if (!round) return;
    setSaving(true);
    const hole = round.tee.holes.find((h) => h.number === currentHole);
    if (!hole) { setSaving(false); return; }

    await Promise.all(
      round.players.map((player) => {
        const s = scores[player.id]?.[currentHole];
        if (!s || s.strokes < 1) return null;
        return fetch(`/api/rounds/${id}/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundPlayerId: player.id,
            holeNumber: currentHole,
            strokes: s.strokes,
            penalties: s.penalties ?? 0,
            putts: s.putts,
            fairwayHit: s.fairwayHit,
            gir: s.gir,
          }),
        });
      })
    );
    setSaving(false);
    if (round && currentHole < round.startingHole - 1 + round.holesCount) {
      changeHole((h) => h + 1);
    }
  }

  async function finishRound() {
    if (round?.status === "COMPLETE") {
      await saveHole();
      router.push(`/rounds/${id}/summary`);
    } else {
      await saveHole();
      await fetch(`/api/rounds/${id}/complete`, { method: "POST" });
      router.push(`/rounds/${id}/summary`);
    }
  }

  function dismissPrizeHolePopup() {
    setPopupDismissedForHole(currentHole);
  }

  if (!round) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <p className="text-gray-400">Loading scorecard…</p>
      </div>
    );
  }

  const holes = round.tee.holes.slice(
    round.startingHole - 1,
    round.startingHole - 1 + round.holesCount
  );
  const hole = holes.find((h) => h.number === currentHole);
  const lastHoleNumber = holes[holes.length - 1]?.number ?? 18;
  const isAmbrose = round.format === "AMBROSE_2" || round.format === "AMBROSE_4";
  const tournament = round.tournamentRounds?.[0]?.tournament;

  // Group players by teamNumber for Ambrose; each entry has teamNumber + sorted members
  const teams = isAmbrose
    ? [...new Set(round.players.map((p) => p.teamNumber ?? 0))].sort().map((tn) => ({
        teamNumber: tn,
        members: round.players.filter((p) => (p.teamNumber ?? 0) === tn),
      }))
    : [];

  const allEntered = isAmbrose
    ? teams.every((team) => (scores[team.members[0]?.id]?.[currentHole]?.strokes ?? 0) > 0)
    : round.players.every((p) => (scores[p.id]?.[currentHole]?.strokes ?? 0) > 0);

  // Group-only leaderboard for casual rounds (tournament rounds use TournamentLeaderboard)
  const leaderboard = isAmbrose
    ? teams.map((team) => {
        const phs = team.members.map((m) => m.playingHandicap);
        const teamHCP = ambroseTeamHandicap(round.format, phs);
        const memberNames = team.members.map((m) => m.user.name.split(" ")[0]).join(" & ");
        const rep = team.members[0];
        let total = 0;
        let holesPlayed = 0;
        for (const h of holes) {
          const s = scores[rep?.id]?.[h.number]?.strokes;
          if (!s) continue;
          holesPlayed++;
          total += s - strokesReceived(teamHCP, h.strokeIndex) - h.par;
        }
        return { name: `Team ${team.teamNumber}`, subName: memberNames, total, holesPlayed };
      }).sort((a, b) => a.total - b.total)
    : round.players.map((player) => {
        let total = 0;
        let holesPlayed = 0;
        for (const h of holes) {
          const s = scores[player.id]?.[h.number]?.strokes;
          if (!s) continue;
          holesPlayed++;
          if (round.format === "STABLEFORD") {
            total += stablefordPoints(s, h.par, player.playingHandicap, h.strokeIndex);
          } else {
            total += s - strokesReceived(player.playingHandicap, h.strokeIndex) - h.par;
          }
        }
        return { name: player.user.name, subName: null as string | null, total, holesPlayed };
      }).sort((a, b) =>
        round.format === "STABLEFORD" ? b.total - a.total : a.total - b.total
      );

  return (
    <div className="space-y-4 max-w-xl">
      {/* Header */}
      <div className="bg-fairway-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold">{round.course.name}</p>
          <p className="text-fairway-300 text-xs">{round.tee.name} tees · {round.format.replace(/_/g, " ")}</p>
          {round.status === "COMPLETE" && (
            <p className="text-xs text-acorn-400 mt-0.5">Editing saved round</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{currentHole}<span className="text-fairway-400 text-base">/{lastHoleNumber}</span></p>
          <p className="text-fairway-300 text-xs">hole</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-fairway-50 rounded-xl p-1">
        <button
          onClick={() => setTab("score")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "score" ? "bg-white text-fairway-900 shadow-sm" : "text-gray-500"}`}
        >
          Scorecard
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "leaderboard" ? "bg-white text-fairway-900 shadow-sm" : "text-gray-500"}`}
        >
          Leaderboard
        </button>
      </div>

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
          {isAmbrose
            ? teams.map((team) => {
                const phs = team.members.map((m) => m.playingHandicap);
                const teamHCP = ambroseTeamHandicap(round.format, phs);
                const memberNames = team.members.map((m) => m.user.name).join(" & ");
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
                    onChange={(s) => updateTeamScore(team.teamNumber, currentHole, s)}
                  />
                );
              })
            : round.players.map((player) => {
                const s = scores[player.id]?.[currentHole] ?? { strokes: 0, penalties: 0 };
                const handi = strokesReceived(player.playingHandicap, hole.strokeIndex);
                const netPar = hole.par + handi;
                return (
                  <div key={player.id} className="bg-white rounded-xl p-4 shadow-sm border border-fairway-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-fairway-900">{player.user.name}</p>
                        <p className="text-sm font-medium text-fairway-700 mt-0.5">
                          Hcap {player.playingHandicap}
                          <span className="mx-1.5 text-fairway-300">·</span>
                          +{handi} shot{handi !== 1 ? "s" : ""}
                          <span className="mx-1.5 text-fairway-300">·</span>
                          Net par {netPar}
                        </p>
                      </div>
                      {s.strokes > 0 && (
                        <span className={`w-9 h-9 flex items-center justify-center font-bold text-sm ${scoreBadgeClass(s.strokes, hole.par, player.playingHandicap, hole.strokeIndex)}`}>
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
              ← Hole {currentHole - 1}
            </button>
            {currentHole !== lastHoleNumber && round.status !== "COMPLETE" && (
              <button
                onClick={saveHole}
                disabled={saving || !allEntered}
                className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving…" : `Save & Hole ${currentHole + 1} →`}
              </button>
            )}
          </div>

          {(currentHole === lastHoleNumber || round.status === "COMPLETE") && (
            <button
              onClick={finishRound}
              className="w-full py-3 bg-acorn-700 text-white rounded-xl font-semibold hover:bg-acorn-900 transition-colors"
            >
              {round.status === "COMPLETE" ? "✓ Save & Return to Summary" : "🏁 Finish Round"}
            </button>
          )}

          {/* Hole dots */}
          <div className="flex gap-1 justify-center flex-wrap">
            {holes.map((h) => {
              const entered = isAmbrose
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
          {leaderboard.map((entry, i) => (
            <div
              key={entry.name}
              className={`flex items-center gap-3 p-4 rounded-xl ${i === 0 ? "bg-fairway-900 text-white" : "bg-white border border-fairway-50"}`}
            >
              <span className={`text-lg font-bold w-6 ${i === 0 ? "text-fairway-300" : "text-gray-400"}`}>{i + 1}</span>
              <div className="flex-1">
                <p className={`font-semibold ${i === 0 ? "text-white" : "text-fairway-900"}`}>{entry.name}</p>
                {entry.subName && (
                  <p className={`text-xs ${i === 0 ? "text-fairway-400" : "text-gray-400"}`}>{entry.subName}</p>
                )}
                <p className={`text-xs ${i === 0 ? "text-fairway-300" : "text-gray-400"}`}>
                  {entry.holesPlayed} hole{entry.holesPlayed !== 1 ? "s" : ""} played
                </p>
              </div>
              <span className={`text-xl font-bold ${i === 0 ? "text-fairway-300" : "text-fairway-700"}`}>
                {round.format === "STABLEFORD"
                  ? `${entry.total} pts`
                  : entry.total === 0
                  ? "E"
                  : entry.total > 0
                  ? `+${entry.total}`
                  : entry.total}
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
