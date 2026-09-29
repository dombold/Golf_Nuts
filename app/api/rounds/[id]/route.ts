import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateHandicapIndex } from "@/lib/recalcHandicap";
import { NextRequest } from "next/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify the current user is a player in this round and collect all player IDs
  const round = await prisma.round.findFirst({
    where: { id, players: { some: { userId: session.user.id } } },
    select: { players: { select: { userId: true } }, _count: { select: { tournamentRounds: true } } },
  });
  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });
  if (round._count.tournamentRounds > 0) {
    return Response.json(
      { error: "This round is part of an event — delete the event instead." },
      { status: 409 }
    );
  }

  // Deleting the round cascades to HandicapHistory rows via the FK constraint
  await prisma.round.delete({ where: { id } });

  // Recalculate handicap for every player in the round
  await Promise.all(round.players.map(({ userId }) => updateHandicapIndex(userId)));

  return Response.json({ success: true });
}
