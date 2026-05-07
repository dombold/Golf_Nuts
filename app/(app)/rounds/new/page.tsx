"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const FORMATS = [
  { value: "STROKEPLAY", label: "Strokeplay", desc: "Total gross / net strokes" },
  { value: "STABLEFORD", label: "Stableford", desc: "Points per hole" },
  { value: "MATCH_PLAY", label: "Match Play", desc: "Hole-by-hole win/loss" },
  { value: "SKINS", label: "Skins", desc: "Win each hole outright" },
  { value: "AMBROSE_2", label: "2-Player Ambrose", desc: "Best ball scramble (pairs)" },
  { value: "AMBROSE_4", label: "4-Player Ambrose", desc: "Best ball scramble (teams of 4)" },
];

interface Course { id: string; name: string; suburb: string | null; city: string | null; tees: Tee[] }
interface Tee { id: string; name: string; rating: number; slope: number; par: number; totalMeters: number | null }
interface User { id: string; name: string; email: string }

function parseNineNames(teeName: string): { front: string; back: string } | null {
  const parts = teeName.split("/");
  return parts.length === 2 ? { front: parts[0].trim(), back: parts[1].trim() } : null;
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
  const [format, setFormat] = useState("STABLEFORD");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      setUsers(d.users ?? []);
      setCurrentUser(d.currentUser);
    });
    if (preselectedCourseId) {
      fetch(`/api/courses/${preselectedCourseId}`)
        .then((r) => r.json())
        .then((d) => { if (d.course) setSelectedCourse(d.course); })
        .catch(() => {});
    }
  }, [preselectedCourseId]);

  useEffect(() => {
    if (currentUser && !selectedPlayers.includes(currentUser.id)) {
      setSelectedPlayers([currentUser.id]);
    }
  }, [currentUser]);

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

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-fairway-900">New Round</h1>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
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

          <div className="space-y-2">
            <p className="text-sm font-medium text-fairway-800">Holes</p>
            <div className="flex gap-2">
              {([9, 18] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => { setHolesCount(n); if (n === 18) setStartingHole(1); }}
                  className={`flex-1 py-2.5 rounded-xl border font-semibold transition-colors ${
                    holesCount === n
                      ? "border-fairway-600 bg-fairway-50 text-fairway-900"
                      : "border-gray-200 bg-white text-gray-600 hover:border-fairway-300"
                  }`}
                >
                  {n} holes
                </button>
              ))}
            </div>
          </div>

          {holesCount === 9 && selectedTee && (() => {
            const names = parseNineNames(selectedTee.name);
            const options: { label: string; value: 1 | 10 }[] = names
              ? [{ label: names.front, value: 1 }, { label: names.back, value: 10 }]
              : [{ label: "Front 9", value: 1 }, { label: "Back 9", value: 10 }];
            return (
              <div className="space-y-2">
                <p className="text-sm font-medium text-fairway-800">Which 9?</p>
                <div className="flex gap-2">
                  {options.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setStartingHole(o.value)}
                      className={`flex-1 py-2.5 rounded-xl border font-semibold transition-colors ${
                        startingHole === o.value
                          ? "border-fairway-600 bg-fairway-50 text-fairway-900"
                          : "border-gray-200 bg-white text-gray-600 hover:border-fairway-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

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
          <div className="space-y-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  format === f.value
                    ? "border-fairway-600 bg-fairway-50"
                    : "border-gray-200 bg-white hover:border-fairway-300"
                }`}
              >
                <p className="font-medium text-fairway-900">{f.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
              </button>
            ))}
          </div>
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
          <div className="space-y-2">
            {currentUser && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-fairway-50 border border-fairway-200">
                <div className="w-5 h-5 rounded-full bg-fairway-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium text-fairway-900">{currentUser.name} (You)</span>
              </div>
            )}
            {users.map((user) => {
              const selected = selectedPlayers.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => togglePlayer(user.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    selected ? "border-fairway-600 bg-fairway-50" : "border-gray-200 bg-white hover:border-fairway-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "bg-fairway-600 border-fairway-600" : "border-gray-300"}`}>
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-fairway-900">{user.name}</span>
                </button>
              );
            })}
            {users.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                No other users registered yet.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              ← Back
            </button>
            <button
              onClick={createRound}
              disabled={loading || selectedPlayers.length === 0}
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
