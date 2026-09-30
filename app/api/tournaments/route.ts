import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { EventFormatSchema } from "@/lib/gameFormats";
import { sendTournamentInviteNotification } from "@/lib/push";
import { validatePrizeHoles } from "@/lib/prizeHoles";
import { pruneStaleTournaments } from "@/lib/staleTournaments";

const PrizeHoleSchema = z.object({
  holeNumber: z.number().int().min(1).max(18),
  type: z.enum(["LONGEST_DRIVE", "NEAREST_PIN"]),
});

const CreateSchema = z.object({
  name: z.string().min(2).trim(),
  format: EventFormatSchema,
  courseId: z.string(),
  teeId: z.string(),
  holesCount: z.union([z.literal(9), z.literal(18)]).default(18),
  startingHole: z.union([z.literal(1), z.literal(10)]).default(1),
  date: z.string().optional(),
  inviteeIds: z.array(z.string()).default([]),
  prizeHoles: z.array(PrizeHoleSchema).default([]),
  skinsCarryOver: z.boolean().default(true),
  stablefordTeamSize: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, format, courseId, teeId, holesCount, date, inviteeIds, prizeHoles, skinsCarryOver, stablefordTeamSize } = parsed.data;
  const startingHole = holesCount === 18 ? 1 : parsed.data.startingHole;
  const organiserId = session.user.id;

  // Deduplicate invitees and exclude the organiser (they're auto-accepted separately)
  const otherInvitees = [...new Set(inviteeIds)].filter((id) => id !== organiserId);

  const prizeHoleError = validatePrizeHoles(prizeHoles, holesCount, startingHole);
  if (prizeHoleError) {
    return Response.json({ error: { message: prizeHoleError } }, { status: 400 });
  }

  const tee = await prisma.tee.findUnique({ where: { id: teeId }, select: { courseId: true } });
  if (!tee || tee.courseId !== courseId) {
    return Response.json({ error: { message: "That tee doesn't belong to the selected course" } }, { status: 400 });
  }
  const inviteeCount = await prisma.user.count({ where: { id: { in: otherInvitees } } });
  if (inviteeCount !== otherInvitees.length) {
    return Response.json({ error: { message: "One or more invitees no longer exist" } }, { status: 400 });
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
      holesCount,
      startingHole,
      skinsCarryOver,
      stablefordTeamSize: format === "STABLEFORD" ? stablefordTeamSize : 1,
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

  // Housekeeping: clear out never-started events long past their date
  await pruneStaleTournaments();

  // Fire push notifications to invitees — non-blocking, won't fail the request
  if (otherInvitees.length > 0) {
    void Promise.allSettled(
      otherInvitees.map((id) => sendTournamentInviteNotification(id, name, tournament.id))
    );
  }

  return Response.json({ tournament }, { status: 201 });
}

export async function GET() {
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
