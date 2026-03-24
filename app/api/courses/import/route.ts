import { auth } from "@/lib/auth";
import { getCourseById } from "@/lib/courseApi";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { externalId } = await req.json();
    if (!externalId) return Response.json({ error: "externalId required" }, { status: 400 });

    // Return existing course if already imported
    const existing = await prisma.course.findUnique({ where: { externalId } });
    if (existing) return Response.json({ course: existing });

    const apiCourse = await getCourseById(externalId);
    console.log("[import] apiCourse keys:", Object.keys(apiCourse));
    console.log("[import] tees count:", apiCourse.tees?.length ?? 0);
    if (apiCourse.tees?.[0]) {
      console.log("[import] first tee:", JSON.stringify(apiCourse.tees[0]).slice(0, 300));
    }

    const course = await prisma.course.create({
      data: {
        name: [apiCourse.club_name, apiCourse.course_name].filter(Boolean).join(" — "),
        address: apiCourse.location?.address,
        city: apiCourse.location?.city,
        state: apiCourse.location?.state,
        country: apiCourse.location?.country,
        externalId,
        tees: {
          create: (apiCourse.tees ?? []).map((tee) => ({
            name: tee.tee_name,
            color: tee.tee_color,
            rating: tee.course_rating,
            slope: tee.slope_rating,
            par: tee.par,
            holes: {
              create: (tee.holes ?? []).map((h) => ({
                number: h.hole_number,
                par: h.par,
                strokeIndex: h.handicap,
                distance: h.yardage,
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
