import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const externalId = body.externalId != null ? String(body.externalId) : null;
    if (!externalId) return Response.json({ error: "externalId required" }, { status: 400 });

    const course = await prisma.course.findUnique({ where: { externalId } });
    if (!course) return Response.json({ error: "Course not found" }, { status: 404 });

    return Response.json({ course });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[import] error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
