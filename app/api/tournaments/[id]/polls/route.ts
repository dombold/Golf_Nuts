import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sendTournamentPollNotification } from "@/lib/push";
import { POLL_MAX, PollSchema, firstIssue } from "@/lib/polls";

type Ctx = { params: Promise<{ id: string }> };

/** Organiser adds a single-choice poll to an event; invitees who haven't declined are notified. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      name: true,
      status: true,
      createdById: true,
      createdBy: { select: { name: true } },
      _count: { select: { polls: true } },
    },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (!(await canOrganise(tournament.createdById, session.user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tournament.status === "COMPLETE") {
    return Response.json({ error: "Polls can't be added once the event is complete" }, { status: 409 });
  }
  if (tournament._count.polls >= POLL_MAX) {
    return Response.json({ error: `An event can have at most ${POLL_MAX} polls` }, { status: 409 });
  }

  const parsed = PollSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const { question, options } = parsed.data;

  const poll = await prisma.tournamentPoll.create({
    data: {
      tournamentId: id,
      question,
      options: { create: options.map((label, position) => ({ label, position })) },
    },
    select: { id: true },
  });

  await logTournamentAction(session.user.id, "tournament.poll.create", { id, createdById: tournament.createdById }, `Added poll “${question}”`);

  // Notify invitees who haven't declined (not the person who added the poll)
  const recipients = await prisma.tournamentInvitation.findMany({
    where: { tournamentId: id, status: { in: ["ACCEPTED", "PENDING"] }, userId: { not: session.user.id }, user: { isGuest: false } },
    select: { userId: true },
  });
  void Promise.allSettled(
    recipients.map(({ userId }) =>
      sendTournamentPollNotification(userId, tournament.createdBy.name, tournament.name, id, question)
    )
  ).catch(() => {});

  return Response.json({ id: poll.id }, { status: 201 });
}
