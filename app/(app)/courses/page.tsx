import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CourseList from "./CourseList";

export default async function CoursesPage() {
  const session = await auth();

  const userCourses = await prisma.userCourse.findMany({
    where: { userId: session!.user.id },
    include: { course: { include: { tees: true } } },
    orderBy: { course: { name: "asc" } },
  });

  const courses = userCourses.map((uc) => uc.course);

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
            Search and add a course
          </Link>
        </div>
      ) : (
        <CourseList courses={courses} />
      )}
    </div>
  );
}
