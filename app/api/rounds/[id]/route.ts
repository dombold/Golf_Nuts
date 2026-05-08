import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcHandicap } from "@/lib/recalcHandicap";
import { NextRequest } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the current user is a player in this round and collect all player IDs
  const round = await prisma.round.findFirst({
    where: { id, players: { some: { userId: dbUser.id } } },
    include: { players: { select: { userId: true } } },
  });
  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });

  // Deleting the round cascades to HandicapHistory rows via the FK constraint
  await prisma.round.delete({ where: { id } });

  // Recalculate handicap for every player in the round
  await Promise.all(
    round.players.map(async ({ userId }) => {
      const newIndex = await recalcHandicap(userId);
      if (newIndex !== null) {
        await prisma.user.update({ where: { id: userId }, data: { handicapIndex: newIndex } });
      }
    })
  );

  return Response.json({ success: true });
}
