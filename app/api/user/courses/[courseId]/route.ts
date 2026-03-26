import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;

  await prisma.userCourse.delete({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });

  return Response.json({ ok: true });
}
