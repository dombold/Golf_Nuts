import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
    include: { tees: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return Response.json({ courses });
}
