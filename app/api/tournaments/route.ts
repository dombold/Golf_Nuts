import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { sendTournamentInviteNotification } from "@/lib/push";

const PrizeHoleSchema = z.object({
  holeNumber: z.number().int().min(1).max(18),
  type: z.enum(["LONGEST_DRIVE", "NEAREST_PIN"]),
});

const CreateSchema = z.object({
  name: z.string().min(2).trim(),
  format: z.enum(["STROKEPLAY", "STABLEFORD", "MATCH_PLAY", "SKINS", "AMBROSE_2", "AMBROSE_4"]),
  courseId: z.string(),
  teeId: z.string(),
  date: z.string().optional(),
  inviteeIds: z.array(z.string()).default([]),
  prizeHoles: z.array(PrizeHoleSchema).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, format, courseId, teeId, date, inviteeIds, prizeHoles } = parsed.data;
  const organiserId = session.user.id;

  // Deduplicate invitees and exclude the organiser (they're auto-accepted separately)
  const otherInvitees = [...new Set(inviteeIds)].filter((id) => id !== organiserId);

  for (const nine of [true, false]) {
    if (prizeHoles.filter((h) => h.type === "NEAREST_PIN" && (h.holeNumber <= 9) === nine).length > 2 ||
        prizeHoles.filter((h) => h.type === "LONGEST_DRIVE" && (h.holeNumber <= 9) === nine).length > 1) {
      return Response.json({ error: { message: "Too many prize holes of the same type per nine" } }, { status: 400 });
    }
  }

  // Verify the organiser exists — catches stale JWT sessions
  const organiserExists = await prisma.user.findUnique({ where: { id: organiserId }, select: { id: true } });
  if (!organiserExists) {
    return Response.json({ error: { message: "Session expired — please sign out and sign back in." } }, { status: 401 });
  }

  const tournament = await prisma.tournament.create({
    data: {
      name,
      format,
      courseId,
      teeId,
      date: date ? new Date(date) : null,
      createdById: organiserId,
      invitations: {
        create: [
          // Organiser is auto-accepted
          { userId: organiserId, status: "ACCEPTED" },
          // Other invitees get PENDING status
          ...otherInvitees.map((userId) => ({ userId, status: "PENDING" as const })),
        ],
      },
      prizeHoles: prizeHoles.length > 0 ? { create: prizeHoles } : undefined,
    },
  });

  // Fire push notifications to invitees — non-blocking, won't fail the request
  if (otherInvitees.length > 0) {
    void Promise.allSettled(
      otherInvitees.map((id) => sendTournamentInviteNotification(id, name, tournament.id))
    );
  }

  return Response.json({ tournament }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tournaments = await prisma.tournament.findMany({
    include: {
      course: { select: { name: true } },
      createdBy: { select: { name: true } },
      invitations: { where: { userId: session.user.id } },
      rounds: {
        include: {
          round: {
            include: {
              course: { select: { name: true } },
              players: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { roundNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ tournaments });
}
