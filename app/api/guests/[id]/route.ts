import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { deleteGuest, guestErrorResponse } from "@/lib/guests";

type Ctx = { params: Promise<{ id: string }> };

/** Remove a guest who hasn't scored (organiser / guest creator only). */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteGuest(id, session.user.id);
  } catch (err) {
    return guestErrorResponse(err);
  }
  return Response.json({ ok: true });
}
