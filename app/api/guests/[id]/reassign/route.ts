import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { guestErrorResponse, reassignGuest } from "@/lib/guests";

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({ userId: z.string().min(1) });

/** Move a guest's scores to a registered member (organiser / round creator only). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a member" }, { status: 400 });

  try {
    const result = await reassignGuest(id, parsed.data.userId, session.user.id);
    return Response.json(result);
  } catch (err) {
    return guestErrorResponse(err);
  }
}
