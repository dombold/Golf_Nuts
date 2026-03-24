import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcDifferential } from "@/lib/handicap";
import { recalcHandicap } from "@/lib/recalcHandicap";
import type { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/rounds/[id]/complete">
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roundId } = await ctx.params;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      tee: true,
      players: {
        include: {
          user: true,
          scores: true,
        },
      },
    },
  });
  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });

  await prisma.round.update({
    where: { id: roundId },
    data: { status: "COMPLETE" },
  });

  // Update handicap for each player
  await Promise.all(
    round.players.map(async (rp) => {
      const grossScore = rp.scores.reduce((sum, s) => sum + s.strokes, 0);
      if (grossScore === 0) return;

      const differential = calcDifferential({
        adjustedGrossScore: grossScore,
        courseRating: round.tee.rating,
        slopeRating: round.tee.slope,
      });

      await prisma.handicapHistory.create({
        data: {
          userId: rp.userId,
          index: rp.user.handicapIndex,
          differential,
          roundId,
        },
      });

      const newIndex = await recalcHandicap(rp.userId);

      await prisma.user.update({
        where: { id: rp.userId },
        data: { handicapIndex: newIndex },
      });
    })
  );

  return Response.json({ success: true });
}
