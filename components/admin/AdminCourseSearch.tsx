"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Result {
  id: string;
  name: string;
  place: string | null;
  teeCount: number;
  holes: number;
  mapped: number;
}

/** Find any course by name or alias, then open it or edit its hole coordinates. */
export default function AdminCourseSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const term = query.trim();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/courses/search?q=${encodeURIComponent(term)}`);
        if (!res.ok) throw new Error();
        setResults((await res.json()).courses ?? []);
      } catch {
        setError("Couldn't search courses");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [term]);

  const shown = term.length >= 2 ? results : [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <label htmlFor="admin-course-search" className="sr-only">Search courses</label>
        <input
          id="admin-course-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by course or club name…"
          autoComplete="off"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        />
        {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true">…</span>}
      </div>

      <div aria-live="polite">
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {!searching && !error && term.length >= 2 && shown.length === 0 && (
          <p className="text-sm text-gray-400 px-1">No courses found for &quot;{term}&quot;</p>
        )}
      </div>

      {shown.length > 0 && (
        <ul className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {shown.map((c) => (
            <li key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/courses/${c.id}`} className="text-sm font-semibold text-fairway-800 hover:underline break-words">
                  {c.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {[c.place, `${c.teeCount} tee${c.teeCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ")} ·{" "}
                  <span className={c.mapped === 0 ? "" : c.mapped === c.holes ? "text-fairway-700 font-medium" : "text-acorn-700 font-medium"}>
                    {c.mapped === 0 ? "no holes mapped" : `${c.mapped} of ${c.holes} holes mapped`}
                  </span>
                </p>
              </div>
              <Link
                href={`/courses/${c.id}/edit`}
                className="shrink-0 text-xs px-2 py-1 rounded-lg border border-fairway-200 text-fairway-800 hover:bg-fairway-50 active:bg-fairway-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
              >
                📍 Coordinates
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
