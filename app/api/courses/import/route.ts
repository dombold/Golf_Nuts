import { auth } from "@/lib/auth";
import { getCourseById, flattenTees } from "@/lib/courseApi";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const externalId = body.externalId != null ? String(body.externalId) : null;
    if (!externalId) return Response.json({ error: "externalId required" }, { status: 400 });

    // Return existing course if already imported
    const existing = await prisma.course.findUnique({ where: { externalId } });
    if (existing) return Response.json({ course: existing });

    const apiCourse = await getCourseById(externalId);

    const course = await prisma.course.create({
      data: {
        name: [apiCourse.club_name, apiCourse.course_name].filter(Boolean).join(" — "),
        address: apiCourse.location?.address,
        city: apiCourse.location?.city,
        state: apiCourse.location?.state,
        country: apiCourse.location?.country,
        externalId,
        tees: {
          create: flattenTees(apiCourse.tees).map((tee) => ({
            name: tee.tee_name,
            color: tee.tee_color,
            rating: tee.course_rating,
            slope: tee.slope_rating,
            par: tee.par_total,
            holes: {
              create: (tee.holes ?? []).map((h, i) => ({
                number: i + 1,
                par: h.par,
                strokeIndex: h.handicap ?? 0,
                distance: h.yardage != null ? Math.round(h.yardage * 0.9144) : null,
              })),
            },
          })),
        },
      },
      include: { tees: { include: { holes: true } } },
    });

    return Response.json({ course });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[import] error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
