import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userCourses = await prisma.userCourse.findMany({
    where: { userId: session.user.id },
    select: { courseId: true },
  });

  return Response.json({ courseIds: userCourses.map((uc) => uc.courseId) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await req.json();
  if (!courseId) return Response.json({ error: "courseId required" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });

  await prisma.userCourse.upsert({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    create: { userId: session.user.id, courseId },
    update: {},
  });

  return Response.json({ ok: true });
}
