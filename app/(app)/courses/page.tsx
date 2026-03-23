import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: { tees: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fairway-900">Courses</h1>
        <Link
          href="/courses/search"
          className="bg-fairway-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-fairway-800 transition-colors"
        >
          + Add Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
          <p className="text-3xl mb-2">🗺️</p>
          <p className="mb-3">No courses added yet</p>
          <Link
            href="/courses/search"
            className="text-fairway-700 font-medium hover:underline text-sm"
          >
            Search and import a course
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Link
              key={course.id}
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
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
