import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import Link from "next/link";
import { liveTournamentWhere } from "@/lib/staleTournaments";
import DeleteTournamentButton from "@/components/DeleteTournamentButton";
import { eventDeletionWarning } from "@/lib/deleteTournament";
import PastTournamentsDropdown from "@/components/tournament/PastTournamentsDropdown";
import TournamentResultSummary, {
  type PrizeResult,
  type TournamentResult,
} from "@/components/tournament/TournamentResultSummary";
import {
  calcSkinsGroups,
  calcTournamentStandings,
  skinsGroupWinnerLabel,
  tournamentWinner,
  type StandingsRound,
} from "@/lib/tournamentStandings";

/** Overall winner (or, for Skins, each group's winner) and prize winners for a completed tournament. */
function tournamentResult(t: { id: string; format: string; rounds: StandingsRound[]; prizeHoles: PrizeResult[] }): TournamentResult {
  if (t.format === "SKINS") {
    const groupWinners = calcSkinsGroups(t.rounds).map((g) => ({ groupNumber: g.groupNumber, label: skinsGroupWinnerLabel(g) }));
    return { tournamentId: t.id, winner: null, groupWinners, prizeHoles: t.prizeHoles };
  }
  const standings = calcTournamentStandings(t.rounds, t.format, true);
  return { tournamentId: t.id, winner: tournamentWinner(standings, t.format), prizeHoles: t.prizeHoles };
}

// Computed outside the component body: server components render once per request,
// so reading the clock here is safe.
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function TournamentsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const admin = await isAdmin(userId);

  // Completed events stay at the top for a day after finishing, then move to Previous Events
  const finishedCutoff = daysAgo(1);

  const roundsInclude = {
    include: {
      round: {
        include: {
          course: { select: { name: true } },
          tee: { select: { holes: { select: { number: true, strokeIndex: true, par: true } } } },
          players: {
            include: {
              user: { select: { id: true, name: true, isGuest: true } },
              scores: { select: { holeNumber: true, strokes: true } },
            },
          },
        },
      },
    },
    orderBy: { roundNumber: "asc" as const },
  };

  const prizeHolesSelect = {
    select: { holeNumber: true, type: true, winner: { select: { name: true } } },
  };

  const [tournaments, pastTournaments, pendingCount] = await Promise.all([
    prisma.tournament.findMany({
      where: {
        // Never-started events more than a week past their date are hidden (and pruned on the next event creation)
        ...liveTournamentWhere(),
        OR: [
          { status: { not: "COMPLETE" } },
          { status: "COMPLETE", completedAt: { gt: finishedCutoff } },
        ],
      },
      include: {
        course: { select: { name: true } },
        createdBy: { select: { name: true } },
        invitations: { where: { userId } },
        rounds: roundsInclude,
        prizeHoles: prizeHolesSelect,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tournament.findMany({
      where: {
        status: "COMPLETE",
        OR: [{ completedAt: { lte: finishedCutoff } }, { completedAt: null }],
      },
      include: {
        course: { select: { name: true } },
        createdBy: { select: { name: true } },
        rounds: roundsInclude,
        prizeHoles: prizeHolesSelect,
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.tournamentInvitation.count({
      where: { userId, status: "PENDING", tournament: liveTournamentWhere() },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fairway-900">Tournaments</h1>
        <Link
          href="/tournaments/new"
          className="bg-fairway-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-fairway-800 transition-colors"
        >
          + New Event
        </Link>
      </div>

      {/* Pending invitations banner */}
      {pendingCount > 0 && (
        <div className="rounded-xl bg-acorn-50 border border-acorn-200 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-acorn-800 font-medium">
            You have {pendingCount} pending tournament invitation{pendingCount > 1 ? "s" : ""}
          </p>
          <span className="text-xs text-acorn-600">↓ See below</span>
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
          <p className="text-3xl mb-2">🏆</p>
          <p className="mb-3">{pastTournaments.length > 0 ? "No upcoming or active events" : "No tournaments yet"}</p>
          <Link href="/tournaments/new" className="text-fairway-700 font-medium hover:underline text-sm">
            {pastTournaments.length > 0 ? "Create an event" : "Create your first event"}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => {
            const myInvitation = t.invitations[0];
            const isPending = myInvitation?.status === "PENDING";

            return (
              <div key={t.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isPending ? "border-acorn-300" : "border-fairway-50"}`}>
                <Link href={`/tournaments/${t.id}`} className="block">
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    t.status === "ACTIVE" ? "bg-fairway-700 text-white" : isPending ? "bg-acorn-50" : "bg-fairway-50"
                  }`}>
                    <div>
                      <h2 className={`font-bold ${t.status === "ACTIVE" ? "text-white" : "text-fairway-900"}`}>
                        {t.name}
                      </h2>
                      <p className={`text-xs ${t.status === "ACTIVE" ? "text-fairway-200" : "text-gray-500"}`}>
                        {t.format.replace(/_/g, " ")}
                        {t.course ? ` · ${t.course.name}` : ""}
                        {" · "}by {t.createdBy.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-acorn-600 text-white">
                          Invited
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        t.status === "ACTIVE"
                          ? "bg-fairway-500 text-white"
                          : t.status === "COMPLETE"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-acorn-100 text-acorn-700"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                </Link>

                {t.status === "COMPLETE" && <TournamentResultSummary result={tournamentResult(t)} />}

                {/* Group rounds (visible once active) */}
                {t.rounds.length > 0 && (
                  <div className="divide-y divide-fairway-50">
                    {t.rounds.map((tr) => (
                      <div key={tr.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-fairway-800">
                            Group {tr.roundNumber} — {tr.round.course.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(tr.round.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} ·{" "}
                            {tr.round.players.map((p) => p.user.name.split(" ")[0]).join(", ")}
                          </p>
                        </div>
                        {tr.round.status === "COMPLETE" ? (
                          <Link
                            href={`/rounds/${tr.round.id}/summary`}
                            className="text-xs text-fairway-700 hover:underline font-medium"
                          >
                            View →
                          </Link>
                        ) : (
                          <Link
                            href={`/rounds/${tr.round.id}/score`}
                            className="text-xs bg-fairway-100 text-fairway-700 px-2 py-1 rounded-lg hover:bg-fairway-200 transition-colors font-medium"
                          >
                            Score →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Delete (organiser or admin) */}
                {(t.createdById === userId || admin) && (
                  <div className="px-4 py-2 border-t border-fairway-50 flex justify-end">
                    <DeleteTournamentButton tournamentId={t.id} warning={eventDeletionWarning(t.rounds.map((tr) => tr.round))} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pastTournaments.length > 0 && (
        <PastTournamentsDropdown
          pastTournaments={pastTournaments}
          results={Object.fromEntries(pastTournaments.map((t) => [t.id, tournamentResult(t)]))}
        />
      )}
    </div>
  );
}
