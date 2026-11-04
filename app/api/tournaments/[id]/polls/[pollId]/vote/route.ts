import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canVote } from "@/lib/polls";

type Ctx = { params: Promise<{ id: string; pollId: string }> };

const VoteSchema = z.object({ optionId: z.string().min(1).max(64) });

/** An invited player votes in a poll; voting again changes their choice. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id, pollId } = await params;
  const poll = await prisma.tournamentPoll.findFirst({
    where: { id: pollId, tournamentId: id },
    select: {
      closedAt: true,
      tournament: {
        select: { status: true, invitations: { where: { userId }, select: { status: true } } },
      },
    },
  });
  if (!poll) return Response.json({ error: "Poll not found" }, { status: 404 });

  const invitationStatus = poll.tournament.invitations[0]?.status;
  if (invitationStatus !== "ACCEPTED" && invitationStatus !== "PENDING") {
    return Response.json({ error: "Only invited players can vote in this poll" }, { status: 403 });
  }
  if (!canVote(invitationStatus, poll.tournament.status, poll.closedAt)) {
    return Response.json(
      { error: poll.closedAt ? "This poll is closed" : "The event is complete — voting has finished" },
      { status: 409 }
    );
  }

  const parsed = VoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { optionId } = parsed.data;

  const option = await prisma.tournamentPollOption.findFirst({ where: { id: optionId, pollId }, select: { id: true } });
  if (!option) return Response.json({ error: "That option isn't part of this poll" }, { status: 400 });

  await prisma.tournamentPollVote.upsert({
    where: { pollId_userId: { pollId, userId } },
    create: { pollId, optionId, userId },
    // The player's own vote replaces any the organiser recorded for them
    update: { optionId, recordedById: null },
  });
  return Response.json({ optionId });
}
