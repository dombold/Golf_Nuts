import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateHandicapIndex } from "@/lib/recalcHandicap";
import type { NextRequest } from "next/server";
import { z } from "zod";

const Schema = z.object({ exclude: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roundId } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const roundPlayer = await prisma.roundPlayer.findUnique({
    where: { roundId_userId: { roundId, userId: session.user.id } },
    select: { id: true },
  });
  if (!roundPlayer) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.roundPlayer.update({
    where: { id: roundPlayer.id },
    data: { excludeFromHandicap: parsed.data.exclude },
  });

  const handicapIndex = await updateHandicapIndex(session.user.id);
  return Response.json({ handicapIndex });
}
