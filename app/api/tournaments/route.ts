import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { sendTournamentInviteNotification } from "@/lib/push";

const CreateSchema = z.object({
  name: z.string().min(2).trim(),
  format: z.enum(["STROKEPLAY", "STABLEFORD", "MATCH_PLAY", "SKINS", "AMBROSE_2", "AMBROSE_4"]),
  courseId: z.string(),
  teeId: z.string(),
  date: z.string().optional(),
  inviteeIds: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, format, courseId, teeId, date, inviteeIds } = parsed.data;
  const organiserId = session.user.id;

  // Deduplicate invitees and exclude the organiser (they're auto-accepted separately)
  const otherInvitees = [...new Set(inviteeIds)].filter((id) => id !== organiserId);

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
