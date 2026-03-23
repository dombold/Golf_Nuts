import { auth } from "@/lib/auth";
import { searchCourses } from "@/lib/courseApi";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return Response.json({ courses: [] });
  }

  try {
    const courses = await searchCourses(q.trim());
    return Response.json({ courses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
