"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HolesPicker from "@/components/HolesPicker";
import { GAME_FORMATS, isTeamGame, teamSizeFor } from "@/lib/gameFormats";
import { oddNumberHint, splitIntoTeams, teamGameLabels, teamWarnings } from "@/lib/teams";
import { calcPlayingHandicap } from "@/lib/handicap";
import { ambroseTeamHandicap } from "@/lib/formats";
import FormatPicker from "@/components/FormatPicker";

interface Course { id: string; name: string; suburb: string | null; city: string | null; address?: string | null; phone?: string | null; tees: Tee[] }
interface Tee { id: string; name: string; rating: number; slope: number; par: number; totalMeters: number | null }
interface User { id: string; name: string; email: string; handicapIndex?: number }

function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? "bg-fairway-600 border-fairway-600" : "border-gray-300"}`}>
      {checked && (
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}

function PlayerButton({ user, selected, onClick }: { user: User; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
        selected ? "border-fairway-600 bg-fairway-50" : "border-gray-200 bg-white hover:border-fairway-300"
      }`}
    >
      <CheckCircle checked={selected} />
      <span className="font-medium text-fairway-900 text-left flex-1">{user.name}</span>
      {selected && <span className="text-xs text-gray-400">Tap to remove</span>}
    </button>
  );
}

function NewRoundForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get("courseId");

  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Course search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<Tee | null>(null);
  const [holesCount, setHolesCount] = useState<9 | 18>(18);
  const [startingHole, setStartingHole] = useState<1 | 10>(1);
  const [format, setFormat] = useState("STROKEPLAY");
  const [skinsCarryOver, setSkinsCarryOver] = useState(true);
  const [stablefordTeamSize, setStablefordTeamSize] = useState<1 | 2 | 4>(1);
  // Team games: team number per player, set on the Teams step
  const [teams, setTeams] = useState<Record<string, number>>({});
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playerQuery, setPlayerQuery] = useState("");
  const playerSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      setUsers(d.users ?? []);
      setCurrentUser(d.currentUser);
      if (d.currentUser) {
        const me: string = d.currentUser.id;
        setSelectedPlayers((prev) => (prev.includes(me) ? prev : [me]));
      }
    });
    if (preselectedCourseId) {
      fetch(`/api/courses/${preselectedCourseId}`)
        .then((r) => r.json())
        .then((d) => { if (d.course) setSelectedCourse(d.course); })
        .catch(() => {});
    }
  }, [preselectedCourseId]);

  // Debounced course search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data.courses ?? []);
      } catch { /* silently fail */ }
      finally { setSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function selectCourse(course: Course) {
    setSelectedCourse(course);
    setSelectedTee(null);
    setQuery("");
    setSearchResults([]);
  }

  function togglePlayer(id: string) {
    if (id === currentUser?.id) return;
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  /** Add a player from the search list: clear the search so the full list returns for the next pick. */
  function selectPlayer(id: string) {
    togglePlayer(id);
    if (playerQuery) {
      setPlayerQuery("");
      // Keep the keyboard up only if they were typing — avoids popping it open on a plain tap
      playerSearchRef.current?.focus();
    }
  }

  async function createRound() {
    if (!selectedCourse || !selectedTee) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          teeId: selectedTee.id,
          holesCount,
          startingHole,
          format,
          ...(format === "SKINS" ? { skinsCarryOver } : {}),
          ...(format === "STABLEFORD" ? { stablefordTeamSize } : {}),
          ...(teamGame
            ? { teams: selectedPlayers.map((userId) => ({ userId, teamNumber: needsTeamsStep ? teams[userId] ?? 1 : 1 })) }
            : {}),
          playerIds: selectedPlayers,
        }),
      });
      const data = await res.json();
      if (data.round) {
        router.push(`/rounds/${data.round.id}/score`);
      } else {
        setError(data.error?.message ?? "Failed to create round");
      }
    } catch {
      setError("Failed to create round. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const matchPlayNeedsTwo = format === "MATCH_PLAY" && selectedPlayers.length !== 2;

  // Team games (Ambrose, team Stableford): a Teams step when the players make more than one team
  const teamSize = teamSizeFor(format, stablefordTeamSize);
  const teamGame = isTeamGame(format, stablefordTeamSize);
  const needsTeamsStep = teamGame && selectedPlayers.length > teamSize;
  const totalSteps = needsTeamsStep ? 4 : 3;
  const allPlayers = [...(currentUser ? [currentUser] : []), ...users];
  const playerById = new Map(allPlayers.map((u) => [u.id, u]));

  function goToTeams() {
    const split = splitIntoTeams(
      selectedPlayers.map((id) => ({ userId: id, handicap: playerById.get(id)?.handicapIndex ?? 0 })),
      teamSize
    );
    setTeams(Object.fromEntries(split));
    setStep(4);
  }

  const teamCount = Math.max(1, Math.ceil(selectedPlayers.length / teamSize));
  const teamNumbers = Array.from({ length: teamCount }, (_, i) => i + 1);
  const teamMembers = (t: number) => selectedPlayers.filter((id) => (teams[id] ?? 1) === t);
  const teamHandicap = (t: number) =>
    selectedTee
      ? ambroseTeamHandicap(teamMembers(t).map((id) =>
          calcPlayingHandicap(playerById.get(id)?.handicapIndex ?? 0, selectedTee.slope, selectedTee.rating, selectedTee.par)))
      : null;
  const { gameLabel } = teamGameLabels(format, teamSize);
  const teamsHint = needsTeamsStep ? oddNumberHint(gameLabel, teamSize, selectedPlayers.length, { context: "round" }) : null;
  const teamsWarnings = needsTeamsStep
    ? teamWarnings(teamSize, [{ members: selectedPlayers.map((id) => ({ userId: id, teamNumber: teams[id] ?? 1 })) }])
    : [];

  // Player step: selected players (in pick order) sit above the search, the rest are filtered below it
  const selectedOthers = selectedPlayers
    .filter((id) => id !== currentUser?.id)
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is User => !!u);
  const unselectedUsers = users.filter((u) => !selectedPlayers.includes(u.id));
  const playerSearch = playerQuery.trim().toLowerCase();
  const availableUsers = playerSearch
    ? unselectedUsers.filter((u) => u.name.toLowerCase().includes(playerSearch))
    : unselectedUsers;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-fairway-900">New Round</h1>

      {/* Step indicator */}
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-fairway-600" : "bg-fairway-100"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Course & Tee */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-fairway-800">Select course &amp; tee</h2>

          {/* Course search */}
          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedCourse(null); setSelectedTee(null); }}
                placeholder="Search by course or club name…"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500"
              />
              {searching && (
                <div className="flex items-center px-3 text-gray-400 text-sm">…</div>
              )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {searchResults.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => selectCourse(course)}
                    className="w-full text-left px-4 py-3 hover:bg-fairway-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <p className="font-medium text-fairway-900 text-sm">{course.name}</p>
                    {(course.suburb || course.city) && (
                      <p className="text-xs text-gray-500 mt-0.5">{course.suburb ?? course.city}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!searching && query.trim().length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-gray-400 mt-2 px-1">No courses found for &quot;{query}&quot;</p>
            )}
          </div>

          {/* Selected course & tees */}
          {selectedCourse && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-fairway-600 bg-fairway-50">
                <div>
                  <p className="font-medium text-fairway-900">{selectedCourse.name}</p>
                  {(selectedCourse.suburb || selectedCourse.city) && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedCourse.suburb ?? selectedCourse.city}</p>
                  )}
                  {selectedCourse.address && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedCourse.address}</p>
                  )}
                  {selectedCourse.phone && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedCourse.phone}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedCourse(null); setSelectedTee(null); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Change
                </button>
              </div>

              <p className="text-sm font-medium text-fairway-800 pt-1">Select tee</p>
              <div className="space-y-2">
                {selectedCourse.tees.length === 0 ? (
                  <p className="text-sm text-gray-400 px-1">No tees available for this course.</p>
                ) : (
                  selectedCourse.tees.map((tee) => (
                    <button
                      key={tee.id}
                      onClick={() => setSelectedTee(tee)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                        selectedTee?.id === tee.id
                          ? "border-fairway-600 bg-fairway-100 text-fairway-900"
                          : "border-gray-200 bg-white hover:border-fairway-300"
                      }`}
                    >
                      <span className="font-medium">{tee.name}</span>
                      <span className="text-gray-500 ml-2">CR {tee.rating} / Length {tee.totalMeters != null ? `${tee.totalMeters}m` : "—"} / Par {tee.par}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <HolesPicker
            holesCount={holesCount}
            startingHole={startingHole}
            teeName={selectedTee?.name}
            onChange={(n, start) => { setHolesCount(n); setStartingHole(start); }}
          />

          <button
            onClick={() => setStep(2)}
            disabled={!selectedCourse || !selectedTee}
            className="w-full py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2: Format */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-fairway-800">Choose format</h2>
          <FormatPicker
            formats={GAME_FORMATS}
            value={format}
            onChange={setFormat}
            stablefordTeamSize={stablefordTeamSize}
            onStablefordTeamSizeChange={setStablefordTeamSize}
            skinsCarryOver={skinsCarryOver}
            onSkinsCarryOverChange={setSkinsCarryOver}
          />
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              ← Back
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Players */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-fairway-800">Select players</h2>
          {matchPlayNeedsTwo && (
            <p className="text-sm text-acorn-700 bg-acorn-50 border border-acorn-200 rounded-xl px-3 py-2">
              Match Play is head-to-head — pick exactly one opponent.
            </p>
          )}
          {/* Selected players — above the search */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Playing · {selectedPlayers.length} player{selectedPlayers.length !== 1 ? "s" : ""}
            </p>
            {currentUser && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-fairway-50 border border-fairway-200">
                <CheckCircle checked />
                <span className="font-medium text-fairway-900">{currentUser.name} (You)</span>
              </div>
            )}
            {selectedOthers.map((user) => (
              <PlayerButton key={user.id} user={user} selected onClick={() => togglePlayer(user.id)} />
            ))}
          </div>

          {users.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No other users registered yet.
            </p>
          ) : (
            <div className="space-y-2">
              <input
                ref={playerSearchRef}
                type="search"
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                placeholder="Search players by name…"
                aria-label="Search players"
                autoComplete="off"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500"
              />
              <p aria-live="polite" className="text-xs text-gray-500">
                {unselectedUsers.length === 0
                  ? "Everyone's been added"
                  : availableUsers.length === 0
                  ? `No players match “${playerQuery.trim()}”`
                  : `${availableUsers.length} player${availableUsers.length !== 1 ? "s" : ""} available`}
              </p>

              {/* Unselected players — narrowed by the search */}
              {availableUsers.map((user) => (
                <PlayerButton key={user.id} user={user} selected={false} onClick={() => selectPlayer(user.id)} />
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              ← Back
            </button>
            {needsTeamsStep ? (
              <button
                onClick={goToTeams}
                className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors"
              >
                Next: Teams →
              </button>
            ) : (
              <button
                onClick={createRound}
                disabled={loading || selectedPlayers.length === 0 || matchPlayNeedsTwo}
                className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40"
              >
                {loading ? "Starting…" : "Tee Off! ⛳"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Teams (team games with more than one team) */}
      {step === 4 && needsTeamsStep && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-fairway-800">Teams</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Split by handicap to keep teams even — move anyone with the Team menu.
            </p>
          </div>

          {teamsHint && (
            <p className="text-sm text-acorn-800 bg-acorn-50 border border-acorn-200 rounded-xl px-3 py-2">{teamsHint}</p>
          )}

          {teamNumbers.map((t) => (
            <div key={t} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-fairway-900">Team {t}</h3>
                {teamMembers(t).length > 0 && teamHandicap(t) !== null && (
                  <p className="text-xs text-gray-500">Team hcap {teamHandicap(t)}</p>
                )}
              </div>
              {teamMembers(t).length === 0 && <p className="text-xs text-gray-400">No players</p>}
              {teamMembers(t).map((id) => {
                const player = playerById.get(id);
                return (
                  <div key={id} className="flex items-center gap-2 bg-fairway-50 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-fairway-900">
                      {player?.name}{id === currentUser?.id ? " (You)" : ""}
                      <span className="text-xs text-gray-400 ml-1">HCP {player?.handicapIndex ?? 0}</span>
                    </span>
                    <select
                      value={teams[id] ?? 1}
                      onChange={(e) => setTeams((prev) => ({ ...prev, [id]: Number(e.target.value) }))}
                      aria-label={`${player?.name}'s team`}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
                    >
                      {teamNumbers.map((n) => <option key={n} value={n}>Team {n}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          ))}

          {teamsWarnings.length > 0 && (
            <div role="status" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5">
              <p className="font-semibold">Uneven teams — you can still tee off:</p>
              <ul className="list-disc list-inside">
                {teamsWarnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              ← Back
            </button>
            <button
              onClick={createRound}
              disabled={loading}
              className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40"
            >
              {loading ? "Starting…" : "Tee Off! ⛳"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewRoundPage() {
  return (
    <Suspense>
      <NewRoundForm />
    </Suspense>
  );
}
