import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canVote } from "@/lib/polls";

type Ctx = { params: Promise<{ id: string; pollId: string }> };

const Schema = z.object({
  userId: z.string().min(1).max(64),
  /** null clears the player's vote */
  optionId: z.string().min(1).max(64).nullable(),
});

/**
 * Organiser records (or clears) a vote for an invited player — for someone who told them
 * in person, forgot to reply, or is a guest who can't sign in.
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const actorId = session.user.id;

  const { id, pollId } = await params;
  const poll = await prisma.tournamentPoll.findFirst({
    where: { id: pollId, tournamentId: id },
    select: { question: true, closedAt: true, tournament: { select: { createdById: true, status: true } } },
  });
  if (!poll) return Response.json({ error: "Poll not found" }, { status: 404 });
  if (!(await canOrganise(poll.tournament.createdById, actorId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { userId, optionId } = parsed.data;

  const invitation = await prisma.tournamentInvitation.findUnique({
    where: { tournamentId_userId: { tournamentId: id, userId } },
    select: { status: true, user: { select: { name: true } } },
  });
  if (!invitation || invitation.status === "DECLINED") {
    return Response.json({ error: "Votes can only be recorded for invited players who haven't declined" }, { status: 400 });
  }
  if (!canVote(invitation.status, poll.tournament.status, poll.closedAt)) {
    return Response.json(
      { error: poll.closedAt ? "This poll is closed — reopen it to record a vote" : "The event is complete — voting has finished" },
      { status: 409 }
    );
  }

  if (optionId === null) {
    await prisma.tournamentPollVote.deleteMany({ where: { pollId, userId } });
  } else {
    const option = await prisma.tournamentPollOption.findFirst({ where: { id: optionId, pollId }, select: { id: true } });
    if (!option) return Response.json({ error: "That option isn't part of this poll" }, { status: 400 });

    // The organiser's own vote counts as a normal vote
    const recordedById = userId === actorId ? null : actorId;
    await prisma.tournamentPollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      create: { pollId, optionId, userId, recordedById },
      update: { optionId, recordedById },
    });
  }

  await logTournamentAction(
    actorId,
    optionId === null ? "tournament.poll.vote.clear" : "tournament.poll.vote.record",
    { id, createdById: poll.tournament.createdById },
    `${optionId === null ? "Cleared" : "Recorded"} ${invitation.user.name}'s vote in poll “${poll.question}”`
  );
  return Response.json({ userId, optionId });
}
