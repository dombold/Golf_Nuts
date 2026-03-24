"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
interface User { id: string; name: string; email: string; handicapIndex?: number }

export default function NewTournamentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Name & Date
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  // Step 2 — Course & Tee
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<Tee | null>(null);

  // Step 3 — Format
  const [format, setFormat] = useState("STABLEFORD");

  // Step 4 — Invite players
  const [users, setUsers] = useState<User[]>([]);
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/courses").then((r) => r.json()).then((d) => setCourses(d.courses ?? []));
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(d.users ?? []));
  }, []);

  function toggleInvitee(id: string) {
    setInviteeIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
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

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-fairway-900">New Event</h1>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
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

      {/* Step 3: Format */}
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
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
              ← Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Invite players */}
      {step === 4 && (
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
            <button onClick={() => setStep(3)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
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
