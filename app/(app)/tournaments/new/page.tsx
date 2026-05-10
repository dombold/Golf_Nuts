"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const FORMATS = [
  { value: "STROKEPLAY", label: "Strokeplay", desc: "Total gross / net strokes" },
  { value: "STABLEFORD", label: "Stableford", desc: "Points per hole" },
  { value: "MATCH_PLAY", label: "Match Play", desc: "Hole-by-hole win/loss" },
  { value: "SKINS", label: "Skins", desc: "Win each hole outright" },
  { value: "AMBROSE_2", label: "2-Player Ambrose", desc: "Best ball scramble (pairs)" },
  { value: "AMBROSE_4", label: "4-Player Ambrose", desc: "Best ball scramble (teams of 4)" },
];

interface Course { id: string; name: string; tees: Tee[]; suburb?: string | null; city?: string | null; address?: string | null; phone?: string | null }
interface Tee { id: string; name: string; rating: number; slope: number; par: number; totalMeters: number | null }
interface User { id: string; name: string; email: string; handicapIndex?: number }
interface TeeHole { id: string; number: number; par: number; strokeIndex: number }
interface SelectedPrizeHole { holeNumber: number; type: "LONGEST_DRIVE" | "NEAREST_PIN" }

export default function NewTournamentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Name & Date
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  // Step 2 — Course & Tee
  const [courseQuery, setCourseQuery] = useState("");
  const [courseResults, setCourseResults] = useState<Course[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<Tee | null>(null);

  // Step 3 — Format
  const [format, setFormat] = useState("STABLEFORD");

  // Step 3 — Prize Holes toggle
  const [prizeHolesEnabled, setPrizeHolesEnabled] = useState(false);

  // Step 4 — Prize Hole selection
  const [teeHoles, setTeeHoles] = useState<TeeHole[]>([]);
  const [teeHolesLoading, setTeeHolesLoading] = useState(false);
  const [selectedPrizeHoles, setSelectedPrizeHoles] = useState<SelectedPrizeHole[]>([]);

  // Step 5 — Invite players
  const [users, setUsers] = useState<User[]>([]);
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(d.users ?? []));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (courseQuery.trim().length < 2) {
      setCourseResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCourseLoading(true);
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(courseQuery)}`);
        const data = await res.json();
        setCourseResults(data.courses ?? []);
      } catch {
        setCourseResults([]);
      } finally {
        setCourseLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [courseQuery]);

  // Lazy-fetch tee holes when entering the prize holes step
  useEffect(() => {
    if (step !== 4 || !prizeHolesEnabled || !selectedTee || teeHoles.length > 0) return;
    setTeeHolesLoading(true);
    fetch(`/api/tees/${selectedTee.id}/holes`)
      .then((r) => r.json())
      .then((d) => setTeeHoles(d.holes ?? []))
      .catch(() => setTeeHoles([]))
      .finally(() => setTeeHolesLoading(false));
  }, [step, prizeHolesEnabled, selectedTee, teeHoles.length]);

  function toggleInvitee(id: string) {
    setInviteeIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function togglePrizeHole(holeNumber: number, type: "LONGEST_DRIVE" | "NEAREST_PIN") {
    const isFront = holeNumber <= 9;
    setSelectedPrizeHoles((prev) => {
      // Already selected — deselect
      if (prev.find((p) => p.holeNumber === holeNumber)) {
        return prev.filter((p) => p.holeNumber !== holeNumber);
      }
      const sameTypeAndNine = prev.filter((p) => p.type === type && (p.holeNumber <= 9) === isFront);
      if (type === "NEAREST_PIN") {
        // Allow up to 2 per nine; ignore a 3rd attempt
        if (sameTypeAndNine.length >= 2) return prev;
        return [...prev, { holeNumber, type }];
      }
      // LONGEST_DRIVE: keep 1-per-nine limit — replace existing
      return [
        ...prev.filter((p) => !(p.type === type && (p.holeNumber <= 9) === isFront)),
        { holeNumber, type },
      ];
    });
  }

  function handlePrizeHolesToggle(checked: boolean) {
    setPrizeHolesEnabled(checked);
    if (!checked) setSelectedPrizeHoles([]);
  }

  async function createTournament() {
    if (!selectedCourse || !selectedTee) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          format,
          courseId: selectedCourse.id,
          teeId: selectedTee.id,
          date: date || undefined,
          inviteeIds,
          prizeHoles: selectedPrizeHoles,
        }),
      });
      const data = await res.json();
      if (data.tournament) {
        router.push(`/tournaments/${data.tournament.id}`);
      } else {
        setError(data.error?.message ?? "Failed to create event");
      }
    } catch {
      setError("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = prizeHolesEnabled ? 5 : 4;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-fairway-900">New Event</h1>

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

      {/* Step 1: Name & Date */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-fairway-800">Event details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Club Championship 2026"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500 text-sm"
            />
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!name.trim()}
            className="w-full py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2: Course & Tee */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-fairway-800">Select course &amp; tee</h2>

          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                value={courseQuery}
                onChange={(e) => { setCourseQuery(e.target.value); setSelectedCourse(null); setSelectedTee(null); setTeeHoles([]); }}
                placeholder="Search by course or club name…"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500"
              />
              {courseLoading && (
                <div className="flex items-center px-3 text-gray-400 text-sm">…</div>
              )}
            </div>

            {courseResults.length > 0 && !selectedCourse && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {courseResults.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => { setSelectedCourse(course); setSelectedTee(null); setTeeHoles([]); setCourseResults([]); }}
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

            {!courseLoading && courseQuery.trim().length >= 2 && courseResults.length === 0 && !selectedCourse && (
              <p className="text-sm text-gray-400 mt-2 px-1">No courses found for &quot;{courseQuery}&quot;</p>
            )}
          </div>

          {selectedCourse && (
            <div className="space-y-2">
              <div className="flex items-start justify-between px-4 py-3 rounded-xl border border-fairway-600 bg-fairway-50">
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
                  onClick={() => { setSelectedCourse(null); setSelectedTee(null); setCourseQuery(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-3 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded"
                >
                  Change
                </button>
              </div>
              <div className="ml-4 space-y-2">
                {selectedCourse.tees.map((tee) => (
                  <button
                    key={tee.id}
                    onClick={() => { setSelectedTee(tee); setTeeHoles([]); }}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      selectedTee?.id === tee.id
                        ? "border-fairway-600 bg-fairway-100 text-fairway-900"
                        : "border-gray-100 bg-white hover:border-fairway-200"
                    }`}
                  >
                    {tee.name} — CR {tee.rating} / Length {tee.totalMeters != null ? `${tee.totalMeters}m` : "—"} / Par {tee.par}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedCourse || !selectedTee}
              className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Format + Prize Holes */}
      {step === 3 && (
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

          {/* Prize Holes checkbox */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-fairway-300 transition-colors"
            onClick={() => handlePrizeHolesToggle(!prizeHolesEnabled)}
          >
            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              prizeHolesEnabled ? "bg-fairway-600 border-fairway-600" : "border-gray-300"
            }`}>
              {prizeHolesEnabled && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium text-fairway-900">Prize Holes</p>
              <p className="text-xs text-gray-500 mt-0.5">Designate Longest Drive and Nearest to Pin holes</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
              ← Back
            </button>
            <button
              onClick={() => prizeHolesEnabled ? setStep(4) : setStep(5)}
              className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Prize Hole Selection */}
      {step === 4 && prizeHolesEnabled && (
        <div className="space-y-4">
          <h2 className="font-semibold text-fairway-800">Prize Holes</h2>
          <p className="text-sm text-gray-500">
            Select which holes to designate as prize holes. One Longest Drive and up to two Nearest to Pin holes per nine.
          </p>

          {teeHolesLoading && (
            <p className="text-sm text-gray-400 text-center py-6">Loading holes…</p>
          )}

          {!teeHolesLoading && teeHoles.length > 0 && (() => {
            const frontNine = teeHoles.filter((h) => h.number <= 9);
            const backNine  = teeHoles.filter((h) => h.number >= 10);
            const par5s = (nine: TeeHole[]) => nine.filter((h) => h.par === 5);
            const par3s = (nine: TeeHole[]) => nine.filter((h) => h.par === 3);

            const renderGroup = (
              holes: TeeHole[],
              type: "LONGEST_DRIVE" | "NEAREST_PIN",
              label: string
            ) => {
              if (holes.length === 0) return null;
              return (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {holes.map((h) => {
                      const active = selectedPrizeHoles.some((p) => p.holeNumber === h.number);
                      return (
                        <button
                          key={h.number}
                          onClick={() => togglePrizeHole(h.number, type)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
                            active
                              ? "bg-fairway-600 text-white border-fairway-600"
                              : "bg-white text-fairway-800 border-gray-200 hover:border-fairway-400"
                          }`}
                        >
                          Hole {h.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            };

            const hasFront = par5s(frontNine).length > 0 || par3s(frontNine).length > 0;
            const hasBack  = par5s(backNine).length  > 0 || par3s(backNine).length  > 0;

            return (
              <div className="space-y-5">
                {hasFront && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-fairway-800 border-b border-fairway-100 pb-1">Front Nine</p>
                    {renderGroup(par5s(frontNine), "LONGEST_DRIVE", "Longest Drive (Par 5)")}
                    {renderGroup(par3s(frontNine), "NEAREST_PIN",   "Nearest to Pin (Par 3)")}
                  </div>
                )}
                {hasBack && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-fairway-800 border-b border-fairway-100 pb-1">Back Nine</p>
                    {renderGroup(par5s(backNine), "LONGEST_DRIVE", "Longest Drive (Par 5)")}
                    {renderGroup(par3s(backNine), "NEAREST_PIN",   "Nearest to Pin (Par 3)")}
                  </div>
                )}
                {!hasFront && !hasBack && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No Par 3 or Par 5 holes found for this tee.
                  </p>
                )}
              </div>
            );
          })()}

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
              ← Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Invite players */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-fairway-800">Invite players</h2>
          <p className="text-sm text-gray-500">
            Select players to invite. You&apos;ll be added automatically as the organiser.
          </p>

          <div className="space-y-2">
            {users.map((user) => {
              const selected = inviteeIds.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggleInvitee(user.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    selected ? "border-fairway-600 bg-fairway-50" : "border-gray-200 bg-white hover:border-fairway-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "bg-fairway-600 border-fairway-600" : "border-gray-300"}`}>
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-fairway-900 block">{user.name}</span>
                    {user.handicapIndex !== undefined && (
                      <span className="text-xs text-gray-400">HCP {user.handicapIndex}</span>
                    )}
                  </div>
                </button>
              );
            })}
            {users.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No other users registered yet.</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => prizeHolesEnabled ? setStep(4) : setStep(3)}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              ← Back
            </button>
            <button
              onClick={createTournament}
              disabled={loading}
              className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              {loading ? "Creating…" : "Create Event 🏆"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
