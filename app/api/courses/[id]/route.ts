import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: { tees: { orderBy: [{ totalMeters: { sort: "desc", nulls: "last" } }, { rating: "desc" }] } },
  });

  if (!course) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ course });
}
