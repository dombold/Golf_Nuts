"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Tee { id: string }
interface Course {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  tees: Tee[];
}

export default function CourseList({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; msg: string } | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setDeleting(id);
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError({ id, msg: data.error ?? "Failed to remove course." });
      } else {
        router.refresh();
      }
    } catch {
      setError({ id, msg: "Failed to remove course." });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <div key={course.id}>
          <Link
            href={`/courses/${course.id}`}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-fairway-50 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-fairway-900">{course.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {[course.city, course.state, course.country].filter(Boolean).join(", ")}
              </p>
              <p className="text-xs text-fairway-600 mt-0.5">
                {course.tees.length} tee set{course.tees.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleDelete(e, course.id)}
                disabled={deleting === course.id}
                aria-label={`Remove ${course.name}`}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 transition-colors disabled:opacity-40"
              >
                {deleting === course.id ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0h8" />
                  </svg>
                )}
              </button>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          {error?.id === course.id && (
            <p className="mt-1 ml-4 text-xs text-red-600">{error.msg}</p>
          )}
        </div>
      ))}
    </div>
  );
}
