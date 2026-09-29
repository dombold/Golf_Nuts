import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isHoleInPlay } from "@/lib/nines";
import { recordRoundDifferential } from "@/lib/recalcHandicap";
import type { NextRequest } from "next/server";
import { z } from "zod";

const ScoreSchema = z.object({
  roundPlayerId: z.string(),
  holeNumber: z.int().min(1).max(18),
  strokes: z.int().min(1).max(20),
  penalties: z.int().min(0).max(20).optional().default(0),
  putts: z.int().min(0).max(20).optional(),
  fairwayHit: z.boolean().optional(),
  gir: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/rounds/[id]/score">
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roundId } = await ctx.params;
  const body = await req.json();
  const parsed = ScoreSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { roundPlayerId, holeNumber, strokes, penalties, putts, fairwayHit, gir } = parsed.data;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      status: true,
      format: true,
      holesCount: true,
      startingHole: true,
      players: { select: { id: true, userId: true } },
    },
  });
  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });
  if (!round.players.some((p) => p.userId === session.user.id)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const roundPlayer = round.players.find((p) => p.id === roundPlayerId);
  if (!roundPlayer) {
    return Response.json({ error: "Round player not found" }, { status: 404 });
  }
  if (!isHoleInPlay(holeNumber, round.holesCount, round.startingHole)) {
    return Response.json({ error: { message: "That hole isn't part of this round" } }, { status: 400 });
  }

  const score = await prisma.score.upsert({
    where: { roundPlayerId_holeNumber: { roundPlayerId, holeNumber } },
    update: { strokes, penalties, putts, fairwayHit, gir },
    create: { roundPlayerId, holeNumber, strokes, penalties, putts, fairwayHit, gir },
  });

  // Editing a finished strokeplay round must refresh that player's handicap differential
  if (round.status === "COMPLETE" && round.format === "STROKEPLAY") {
    await recordRoundDifferential(roundId, roundPlayer.userId);
  }

  return Response.json({ score });
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/rounds/[id]/score">
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roundId } = await ctx.params;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      course: { select: { name: true } },
      tee: { include: { holes: { orderBy: { number: "asc" } } } },
      players: {
        include: {
          user: { select: { id: true, name: true } },
          scores: { orderBy: { holeNumber: "asc" } },
        },
      },
      tournamentRounds: {
        take: 1,
        include: {
          tournament: {
            select: {
              id: true,
              status: true,
              prizeHoles: {
                select: { holeNumber: true, type: true },
                orderBy: { holeNumber: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });

  return Response.json({ round });
}
