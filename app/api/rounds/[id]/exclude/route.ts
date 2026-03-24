import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcHandicap } from "@/lib/recalcHandicap";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roundId } = await params;
  const { exclude } = await req.json() as { exclude: boolean };

  const roundPlayer = await prisma.roundPlayer.findUnique({
    where: { roundId_userId: { roundId, userId: session.user.id } },
  });
  if (!roundPlayer) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.roundPlayer.update({
    where: { id: roundPlayer.id },
    data: { excludeFromHandicap: exclude },
  });

  const newIndex = await recalcHandicap(session.user.id);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { handicapIndex: newIndex },
  });

  return Response.json({ handicapIndex: newIndex });
}
