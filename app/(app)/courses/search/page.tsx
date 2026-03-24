"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiCourse } from "@/lib/courseApi";

export default function CourseSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function search(q: string) {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.courses ?? []);
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function importCourse(externalId: string) {
    setImporting(externalId);
    try {
      const res = await fetch("/api/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId }),
      });
      if (!res.ok) {
        let msg = `Import failed (HTTP ${res.status})`;
        try { const d = await res.json(); if (d.error) msg = d.error; } catch {}
        setError(msg);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.course) {
        router.push(`/courses/${data.course.id}`);
      }
    } catch (err) {
      setError(`Import failed: ${err}`);
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-fairway-900">Find a Course</h1>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(query)}
          placeholder="Search by course or club name…"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fairway-500"
        />
        <button
          onClick={() => search(query)}
          disabled={loading}
          className="bg-fairway-700 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-fairway-800 transition-colors disabled:opacity-60"
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-fairway-50 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-fairway-900">
                  {[course.club_name, course.course_name].filter(Boolean).join(" — ")}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[
                    course.location?.city,
                    course.location?.state,
                    course.location?.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <button
                onClick={() => importCourse(course.id)}
                disabled={importing === course.id}
                className="shrink-0 bg-fairway-100 text-fairway-700 hover:bg-fairway-700 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {importing === course.id ? "Adding…" : "Add"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query.length > 1 && (
        <p className="text-gray-400 text-center py-8">No courses found for &quot;{query}&quot;</p>
      )}
    </div>
  );
}
