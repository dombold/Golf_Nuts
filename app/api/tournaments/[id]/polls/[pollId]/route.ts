import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; pollId: string }> };

const PatchSchema = z.object({ closed: z.boolean() });

/** Load the poll (which must belong to this event) and check the user can manage it. */
async function loadForOrganiser(id: string, pollId: string, userId: string) {
  const poll = await prisma.tournamentPoll.findFirst({
    where: { id: pollId, tournamentId: id },
    select: { question: true, tournament: { select: { createdById: true, status: true } } },
  });
  if (!poll) return { response: Response.json({ error: "Poll not found" }, { status: 404 }) };
  if (!(await canOrganise(poll.tournament.createdById, userId))) {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { poll };
}

/** Organiser closes or reopens a poll. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, pollId } = await params;
  const loaded = await loadForOrganiser(id, pollId, session.user.id);
  if ("response" in loaded) return loaded.response;
  const { poll } = loaded;
  if (poll.tournament.status === "COMPLETE") {
    return Response.json({ error: "The event is complete — its polls can no longer change" }, { status: 409 });
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const updated = await prisma.tournamentPoll.update({
    where: { id: pollId },
    data: { closedAt: parsed.data.closed ? new Date() : null },
    select: { closedAt: true },
  });
  await logTournamentAction(
    session.user.id,
    parsed.data.closed ? "tournament.poll.close" : "tournament.poll.reopen",
    { id, createdById: poll.tournament.createdById },
    `${parsed.data.closed ? "Closed" : "Reopened"} poll “${poll.question}”`
  );
  return Response.json({ closedAt: updated.closedAt });
}

/** Organiser deletes a poll, with its options and votes. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, pollId } = await params;
  const loaded = await loadForOrganiser(id, pollId, session.user.id);
  if ("response" in loaded) return loaded.response;
  const { poll } = loaded;

  await prisma.tournamentPoll.delete({ where: { id: pollId } });
  await logTournamentAction(session.user.id, "tournament.poll.delete", { id, createdById: poll.tournament.createdById }, `Deleted poll “${poll.question}”`);
  return Response.json({ success: true });
}
