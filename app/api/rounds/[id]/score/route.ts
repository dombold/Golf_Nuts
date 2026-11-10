import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isHoleInPlay } from "@/lib/nines";
import { recordRoundDifferential } from "@/lib/recalcHandicap";
import { scoreAccess } from "@/lib/scoreAccess";
import { logAdminAction, roundLabel } from "@/lib/permissions";
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
  // How long ago the score was entered on the phone (scores saved offline are sent later).
  // A duration rather than a time, so a phone with its clock set wrong can't skew the comparison.
  enteredMsAgo: z.int().min(0).max(7 * 24 * 60 * 60 * 1000).optional(),
});

type ScoreData = { strokes: number; penalties: number; putts?: number; fairwayHit?: boolean; gir?: boolean; enteredAt: Date };

/**
 * Save a score unless the stored one was entered later (e.g. a teammate's correction that reached
 * the server before this phone got signal back). Returns the score now stored and whether this save lost.
 */
async function saveIfNewer(roundPlayerId: string, holeNumber: number, data: ScoreData) {
  const key = { roundPlayerId, holeNumber };
  // Single conditional UPDATE, so two phones saving at once can't both win
  const updated = await prisma.score.updateMany({
    where: { ...key, OR: [{ enteredAt: null }, { enteredAt: { lte: data.enteredAt } }] },
    data,
  });
  if (updated.count === 0) {
    try {
      const score = await prisma.score.create({ data: { ...key, ...data } });
      return { score, stale: false };
    } catch (e) {
      // P2002: the row exists, so the update above skipped it because it's newer
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  const score = await prisma.score.findUniqueOrThrow({ where: { roundPlayerId_holeNumber: key } });
  return { score, stale: updated.count === 0 };
}

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

  const { roundPlayerId, holeNumber, strokes, penalties, putts, fairwayHit, gir, enteredMsAgo } = parsed.data;
  const enteredAt = new Date(Date.now() - (enteredMsAgo ?? 0));

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
  // Players in the round, or the event organiser / an admin (who can still edit once scores are locked)
  const access = await scoreAccess(roundId, session.user.id);
  if (!access?.canEdit) {
    return Response.json({ error: access?.reason ?? "Forbidden" }, { status: 403 });
  }
  const roundPlayer = round.players.find((p) => p.id === roundPlayerId);
  if (!roundPlayer) {
    return Response.json({ error: "Round player not found" }, { status: 404 });
  }
  if (!isHoleInPlay(holeNumber, round.holesCount, round.startingHole)) {
    return Response.json({ error: { message: "That hole isn't part of this round" } }, { status: 400 });
  }

  const { score, stale } = await saveIfNewer(roundPlayerId, holeNumber, { strokes, penalties, putts, fairwayHit, gir, enteredAt });
  // A newer score is already stored — nothing changed, so tell the phone which one was kept
  if (stale) return Response.json({ score, stale: true });

  if (access.isAdmin) {
    await logAdminAction(
      session.user.id,
      "score.edit",
      { type: "round", id: roundId, ownerId: access.ownerId },
      `Edited scores: ${await roundLabel(roundId)}${access.locked ? " (event locked)" : ""}`,
      { dedupeMinutes: 60 }
    );
  }

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
          user: { select: { id: true, name: true, isGuest: true } },
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

  const access = await scoreAccess(roundId, session.user.id);
  return Response.json({ round, access });
}
