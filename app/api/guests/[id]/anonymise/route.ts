import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { anonymiseGuest, guestErrorResponse } from "@/lib/guests";

type Ctx = { params: Promise<{ id: string }> };

/** Replace a guest's name with "Guest N", keeping their results (organiser / guest creator only). */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await anonymiseGuest(id, session.user.id);
  } catch (err) {
    return guestErrorResponse(err);
  }
  return Response.json({ ok: true });
}
