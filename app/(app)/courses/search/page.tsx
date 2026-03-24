"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Tee {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  tees: Tee[];
}

export default function CourseSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
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
                <p className="font-semibold text-fairway-900">{course.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[course.city, course.state, course.country]
                    .filter(Boolean)
                    .join(", ")}
                  {course.tees.length > 0 && (
                    <span className="ml-2 text-fairway-600">
                      · {course.tees.length} tee{course.tees.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => router.push(`/courses/${course.id}`)}
                className="shrink-0 bg-fairway-100 text-fairway-700 hover:bg-fairway-700 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                View
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
