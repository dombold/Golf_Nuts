import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { notFound } from "next/navigation";
import Link from "next/link";
import HoleCoordinateEditor from "./HoleCoordinateEditor";

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  // Administrators maintain hole coordinates (Admin → Courses → Find a course)
  if (!session?.user || !(await isAdmin(session.user.id))) notFound();

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
        <Link href="/admin/courses" className="text-fairway-600 text-sm hover:underline">
          ← Admin · Courses
        </Link>
        <span className="text-gray-300 mx-2" aria-hidden="true">|</span>
        <Link href={`/courses/${id}`} className="text-fairway-600 text-sm hover:underline">
          View {course.name}
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
