import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import HoleCoordinateEditor from "./HoleCoordinateEditor";

export default async function CourseEditPage({
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
        <Link href={`/courses/${id}`} className="text-fairway-600 text-sm hover:underline">
          ← Back to {course.name}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-fairway-900">{course.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Enter tee and green coordinates for each hole to enable satellite maps during rounds.
        </p>
      </div>
      <HoleCoordinateEditor tees={course.tees} />
    </div>
  );
}
