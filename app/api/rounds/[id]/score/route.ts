import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { z } from "zod";

const ScoreSchema = z.object({
  roundPlayerId: z.string(),
  holeNumber: z.int().min(1).max(18),
  strokes: z.int().min(1).max(20),
  penalties: z.int().min(0).optional().default(0),
  putts: z.int().min(0).optional(),
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

  const roundPlayer = await prisma.roundPlayer.findFirst({
    where: { id: roundPlayerId, roundId },
  });
  if (!roundPlayer) {
    return Response.json({ error: "Round player not found" }, { status: 404 });
  }

  const score = await prisma.score.upsert({
    where: { roundPlayerId_holeNumber: { roundPlayerId, holeNumber } },
    update: { strokes, penalties, putts, fairwayHit, gir },
    create: { roundPlayerId, holeNumber, strokes, penalties, putts, fairwayHit, gir },
  });

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
    },
  });

  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });

  return Response.json({ round });
}
