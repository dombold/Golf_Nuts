"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const FORMATS = [
  { value: "STROKEPLAY", label: "Strokeplay", desc: "Total gross / net strokes" },
  { value: "STABLEFORD", label: "Stableford", desc: "Points per hole" },
  { value: "MATCH_PLAY", label: "Match Play", desc: "Hole-by-hole win/loss" },
  { value: "SKINS", label: "Skins", desc: "Win each hole outright" },
  { value: "AMBROSE_2", label: "2-Player Ambrose", desc: "Best ball scramble (pairs)" },
  { value: "AMBROSE_4", label: "4-Player Ambrose", desc: "Best ball scramble (teams of 4)" },
];

interface Course { id: string; name: string; tees: Tee[] }
interface Tee { id: string; name: string; rating: number; slope: number; par: number }
interface User { id: string; name: string; email: string }

function NewRoundForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get("courseId");

  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<Tee | null>(null);
  const [format, setFormat] = useState("STABLEFORD");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/courses").then((r) => r.json()).then((d) => {
      setCourses(d.courses ?? []);
      if (preselectedCourseId) {
        const c = d.courses?.find((c: Course) => c.id === preselectedCourseId);
        if (c) setSelectedCourse(c);
      }
    });
    fetch("/api/friends").then((r) => r.json()).then((d) => {
      setFriends(d.friends ?? []);
      setCurrentUser(d.currentUser);
    });
  }, [preselectedCourseId]);

  useEffect(() => {
    if (currentUser && !selectedPlayers.includes(currentUser.id)) {
      setSelectedPlayers([currentUser.id]);
    }
  }, [currentUser]);

  function togglePlayer(id: string) {
    if (id === currentUser?.id) return; // can't deselect yourself
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

          {courses.length === 0 ? (
            <div className="bg-fairway-50 rounded-xl p-6 text-center text-gray-500">
              <p className="mb-2">No courses added yet</p>
              <a href="/courses/search" className="text-fairway-700 font-medium hover:underline text-sm">
                Search and add a course first
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <div key={course.id}>
                  <button
                    onClick={() => { setSelectedCourse(course); setSelectedTee(null); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      selectedCourse?.id === course.id
                        ? "border-fairway-600 bg-fairway-50"
                        : "border-gray-200 bg-white hover:border-fairway-300"
                    }`}
                  >
                    <p className="font-medium text-fairway-900">{course.name}</p>
                  </button>
                  {selectedCourse?.id === course.id && (
                    <div className="mt-2 ml-4 space-y-2">
                      {course.tees.map((tee) => (
                        <button
                          key={tee.id}
                          onClick={() => setSelectedTee(tee)}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                            selectedTee?.id === tee.id
                              ? "border-fairway-600 bg-fairway-100 text-fairway-900"
                              : "border-gray-100 bg-white hover:border-fairway-200"
                          }`}
                        >
                          {tee.name} — CR {tee.rating} / Slope {tee.slope} / Par {tee.par}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
            {friends.map((friend) => {
              const selected = selectedPlayers.includes(friend.id);
              return (
                <button
                  key={friend.id}
                  onClick={() => togglePlayer(friend.id)}
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
                  <span className="font-medium text-fairway-900">{friend.name}</span>
                </button>
              );
            })}
            {friends.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                Add friends to play with them.{" "}
                <a href="/friends" className="text-fairway-700 hover:underline">Manage friends →</a>
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
