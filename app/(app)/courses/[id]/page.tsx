import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import TeeSelector from "./TeeSelector";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      tees: {
        include: { holes: { orderBy: { number: "asc" } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!course) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fairway-900">{course.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {[course.city, course.state, course.country].filter(Boolean).join(", ")}
        </p>
      </div>

      <Link
        href={`/rounds/new?courseId=${course.id}`}
        className="block w-full text-center bg-fairway-700 text-white py-3 rounded-xl font-semibold hover:bg-fairway-800 transition-colors"
      >
        ⛳ Start a round here
      </Link>

      <Link
        href={`/courses/${course.id}/edit`}
        className="block w-full text-center border border-fairway-200 text-fairway-700 py-2.5 rounded-xl text-sm font-medium hover:bg-fairway-50 transition-colors"
      >
        Edit hole coordinates
      </Link>

      <TeeSelector tees={course.tees} />
    </div>
  );
}
