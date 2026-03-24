import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const roundCount = await prisma.round.count({ where: { courseId: id } });
  if (roundCount > 0) {
    return Response.json(
      { error: `Cannot remove — this course has ${roundCount} round${roundCount !== 1 ? "s" : ""} recorded against it.` },
      { status: 409 }
    );
  }

  await prisma.course.delete({ where: { id } });
  return Response.json({ ok: true });
}
