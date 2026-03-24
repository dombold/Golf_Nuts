import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return Response.json({ courses: [] });
  }

  const term = q.trim();

  try {
    // Find IDs where any alias matches the search term
    const aliasMatches = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM courses
      WHERE EXISTS (
        SELECT 1 FROM unnest(aliases) AS a
        WHERE a ILIKE ${`%${term}%`}
      )
    `;
    const aliasIds = aliasMatches.map((r) => r.id);

    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { id: { in: aliasIds } },
        ],
      },
      include: { tees: true },
      orderBy: { name: "asc" },
      take: 20,
    });

    return Response.json({ courses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
