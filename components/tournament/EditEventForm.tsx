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

interface Tee { id: string; name: string; rating: number; slope: number; par: number; totalMeters: number | null }
interface Course { id: string; name: string; tees: Tee[] }

interface TournamentData {
  id: string;
  name: string;
  format: string;
  date: string | null;
  course: Course | null;
  tee: Tee | null;
}

export default function EditEventForm({ tournament }: { tournament: TournamentData }) {
  const router = useRouter();
  const [name, setName] = useState(tournament.name);
  const [date, setDate] = useState(
    tournament.date ? new Date(tournament.date).toISOString().split("T")[0] : ""
  );
  const [format, setFormat] = useState(tournament.format);

  const [courseQuery, setCourseQuery] = useState("");
  const [courseResults, setCourseResults] = useState<Course[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(tournament.course);
  const [selectedTee, setSelectedTee] = useState<Tee | null>(tournament.tee);
  const [changingCourse, setChangingCourse] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!changingCourse) return;
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
  }, [courseQuery, changingCourse]);

  function handleChangeCourse() {
    setSelectedCourse(null);
    setSelectedTee(null);
    setCourseQuery("");
    setCourseResults([]);
    setChangingCourse(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          format,
          date: date || null,
          courseId: selectedCourse?.id ?? null,
          teeId: selectedTee?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? data.error ?? "Failed to save changes");
      } else {
        router.push(`/tournaments/${tournament.id}`);
      }
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-fairway-900">Edit Event</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Event name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500 text-sm"
        />
      </div>

      {/* Date */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500 text-sm"
        />
      </div>

      {/* Format */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Format</label>
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
      </div>

      {/* Course */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Course &amp; Tee</label>

        {selectedCourse && !changingCourse ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-fairway-600 bg-fairway-50">
              <p className="font-medium text-fairway-900">{selectedCourse.name}</p>
              <button
                onClick={handleChangeCourse}
                className="text-sm text-fairway-600 hover:text-fairway-800 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded"
              >
                Change
              </button>
            </div>
            {/* Tee selector */}
            <div className="ml-4 space-y-2">
              {selectedCourse.tees.map((tee) => (
                <button
                  key={tee.id}
                  onClick={() => setSelectedTee(tee)}
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
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={courseQuery}
                onChange={(e) => { setCourseQuery(e.target.value); setSelectedTee(null); }}
                placeholder="Search by course or club name…"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500 text-sm"
                autoFocus
              />
              {courseLoading && (
                <span className="self-center text-gray-400 text-sm px-2">…</span>
              )}
            </div>

            {courseQuery.trim().length < 2 && (
              <p className="text-sm text-gray-400 text-center py-2">Type at least 2 characters to search</p>
            )}

            {courseQuery.trim().length >= 2 && !courseLoading && courseResults.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">No courses found for &quot;{courseQuery}&quot;</p>
            )}

            {courseResults.length > 0 && (
              <div className="space-y-2">
                {courseResults.map((course) => (
                  <div key={course.id}>
                    <button
                      onClick={() => { setSelectedCourse(course); setSelectedTee(null); setChangingCourse(false); }}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        selectedCourse?.id === course.id
                          ? "border-fairway-600 bg-fairway-50"
                          : "border-gray-200 bg-white hover:border-fairway-300"
                      }`}
                    >
                      <p className="font-medium text-fairway-900">{course.name}</p>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.push(`/tournaments/${tournament.id}`)}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
