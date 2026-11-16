import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

/**
 * Admin course finder: courses whose name or alias matches `q`, with how many holes on each
 * tee have tee + green coordinates (for the satellite hole maps).
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const term = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (term.length < 2) return Response.json({ courses: [] });

  const aliasMatches = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM courses
    WHERE EXISTS (SELECT 1 FROM unnest(aliases) AS a WHERE a ILIKE ${`%${term}%`})
  `;

  const courses = await prisma.course.findMany({
    where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { id: { in: aliasMatches.map((r) => r.id) } }] },
    select: {
      id: true,
      name: true,
      suburb: true,
      city: true,
      tees: {
        select: { name: true, holes: { select: { teeLat: true, teeLng: true, greenLat: true, greenLng: true } } },
        orderBy: [{ totalMeters: { sort: "desc", nulls: "last" } }, { rating: "desc" }],
      },
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  return Response.json({
    courses: courses.map((c) => {
      const holes = c.tees.flatMap((t) => t.holes);
      return {
        id: c.id,
        name: c.name,
        place: c.suburb ?? c.city,
        teeCount: c.tees.length,
        holes: holes.length,
        mapped: holes.filter((h) => h.teeLat != null && h.teeLng != null && h.greenLat != null && h.greenLng != null).length,
      };
    }),
  });
}
