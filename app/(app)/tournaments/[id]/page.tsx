import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import InvitationResponseCard from "@/components/tournament/InvitationResponseCard";
import GroupBuilder from "@/components/tournament/GroupBuilder";
import StartRoundButton from "@/components/tournament/StartRoundButton";
import TournamentLeaderboard from "@/components/tournament/TournamentLeaderboard";

const FORMAT_LABELS: Record<string, string> = {
  STROKEPLAY: "Strokeplay",
  STABLEFORD: "Stableford",
  MATCH_PLAY: "Match Play",
  SKINS: "Skins",
  AMBROSE_2: "2-Player Ambrose",
  AMBROSE_4: "4-Player Ambrose",
};

const STATUS_STYLES: Record<string, string> = {
  UPCOMING: "bg-acorn-100 text-acorn-700",
  ACTIVE: "bg-fairway-600 text-white",
  COMPLETE: "bg-gray-100 text-gray-600",
};

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, username: true } },
      course: { select: { id: true, name: true, tees: { select: { id: true, name: true } } } },
      tee: { select: { id: true, name: true } },
      invitations: {
        include: {
          user: { select: { id: true, name: true, username: true, handicapIndex: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      groups: {
        orderBy: { groupNumber: "asc" },
        include: {
          tee: { select: { id: true, name: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, username: true, handicapIndex: true } },
            },
          },
        },
      },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          round: {
            include: {
              course: { select: { name: true } },
              players: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  const isOrganiser = tournament.createdById === userId;
  const myInvitation = tournament.invitations.find((inv) => inv.userId === userId);
  const acceptedPlayers = tournament.invitations
    .filter((inv) => inv.status === "ACCEPTED")
    .map((inv) => inv.user);

  const tees = tournament.course?.tees ?? [];
  const defaultTeeId = tournament.teeId ?? tees[0]?.id ?? "";

  // Determine if groups are saved and all accepted players are assigned
  const assignedIds = new Set(tournament.groups.flatMap((g) => g.members.map((m) => m.userId)));
  const allAssigned =
    tournament.groups.length > 0 &&
    acceptedPlayers.every((p) => assignedIds.has(p.id));

  // Check if current user is in any group's round
  const myGroupRound = tournament.rounds.find((tr) =>
    tr.round.players.some((rp) => rp.user.id === userId)
  );

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-fairway-900">{tournament.name}</h1>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[tournament.status]}`}>
            {tournament.status}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Organised by {tournament.createdBy.name}
        </p>
      </div>

      {/* Details card */}
      <dl className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 text-sm">
        {tournament.course && (
          <div className="flex justify-between px-4 py-3">
            <dt className="text-gray-500">Course</dt>
            <dd className="font-medium text-gray-800">{tournament.course.name}</dd>
          </div>
        )}
        {tournament.tee && (
          <div className="flex justify-between px-4 py-3">
            <dt className="text-gray-500">Tee</dt>
            <dd className="font-medium text-gray-800">{tournament.tee.name}</dd>
          </div>
        )}
        <div className="flex justify-between px-4 py-3">
          <dt className="text-gray-500">Format</dt>
          <dd className="font-medium text-gray-800">{FORMAT_LABELS[tournament.format] ?? tournament.format}</dd>
        </div>
        {tournament.date && (
          <div className="flex justify-between px-4 py-3">
            <dt className="text-gray-500">Date</dt>
            <dd className="font-medium text-gray-800">
              {new Date(tournament.date).toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        )}
        <div className="flex justify-between px-4 py-3">
          <dt className="text-gray-500">Players</dt>
          <dd className="font-medium text-gray-800">
            {acceptedPlayers.length} accepted
            {tournament.invitations.filter((i) => i.status === "PENDING").length > 0 &&
              ` · ${tournament.invitations.filter((i) => i.status === "PENDING").length} pending`}
          </dd>
        </div>
      </dl>

      {/* ── UPCOMING STATE ── */}
      {tournament.status === "UPCOMING" && (
        <>
          {/* Invitation response (non-organiser, pending) */}
          {!isOrganiser && myInvitation?.status === "PENDING" && (
            <InvitationResponseCard
              tournamentId={id}
              tournamentName={tournament.name}
              courseName={tournament.course?.name ?? null}
              format={tournament.format}
              date={tournament.date?.toISOString() ?? null}
              organiserName={tournament.createdBy.name}
            />
          )}

          {/* Accepted non-organiser — waiting */}
          {!isOrganiser && myInvitation?.status === "ACCEPTED" && (
            <div className="rounded-xl border border-fairway-200 bg-fairway-50 px-4 py-3 text-sm text-fairway-700">
              You&apos;re in! The organiser will arrange groups before the round starts.
            </div>
          )}

          {/* Declined */}
          {!isOrganiser && myInvitation?.status === "DECLINED" && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              You declined this invitation.
            </div>
          )}

          {/* Organiser view */}
          {isOrganiser && (
            <>
              {/* Player invitation list */}
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-fairway-900">Players</h2>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {tournament.invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{inv.user.name}</p>
                        <p className="text-xs text-gray-400">HCP {inv.user.handicapIndex}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        inv.status === "ACCEPTED"
                          ? "bg-green-100 text-green-700"
                          : inv.status === "DECLINED"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {inv.status === "ACCEPTED" ? "Accepted" : inv.status === "DECLINED" ? "Declined" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group arrangement (only if there are accepted players) */}
              {acceptedPlayers.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-fairway-900">Arrange Groups</h2>
                  <GroupBuilder
                    acceptedPlayers={acceptedPlayers}
                    initialGroups={tournament.groups.map((g) => ({
                      groupNumber: g.groupNumber,
                      teeId: g.teeId,
                      members: g.members.map((m) => ({
                        userId: m.userId,
                        teamNumber: m.teamNumber ?? undefined,
                      })),
                    }))}
                    tees={tees}
                    defaultTeeId={defaultTeeId}
                    format={tournament.format}
                    tournamentId={id}
                  />
                </div>
              )}

              {/* Start round */}
              {acceptedPlayers.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-fairway-900">Start Round</h2>
                  <StartRoundButton
                    tournamentId={id}
                    canStart={allAssigned}
                    blockedReason={
                      tournament.groups.length === 0
                        ? "Save your group arrangement first"
                        : !allAssigned
                        ? "All accepted players must be assigned to a group"
                        : undefined
                    }
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── ACTIVE STATE ── */}
      {tournament.status === "ACTIVE" && (
        <>
          {/* Score link for the current user's group */}
          {myGroupRound && (
            <div className="rounded-xl border border-fairway-200 bg-fairway-50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-fairway-900">Your group is live</p>
                <p className="text-xs text-fairway-600">
                  {myGroupRound.round.players.map((p) => p.user.name.split(" ")[0]).join(", ")}
                </p>
              </div>
              <Link
                href={`/rounds/${myGroupRound.round.id}/score`}
                className="text-sm bg-fairway-700 text-white px-3 py-1.5 rounded-lg hover:bg-fairway-800 transition-colors font-medium"
              >
                Score →
              </Link>
            </div>
          )}

          {/* All group rounds */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-fairway-900">Groups</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {tournament.rounds.map((tr) => (
                <div key={tr.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fairway-800">
                      Group {tr.roundNumber}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tr.round.players.map((p) => p.user.name.split(" ")[0]).join(", ")}
                    </p>
                  </div>
                  {tr.round.status === "COMPLETE" ? (
                    <Link
                      href={`/rounds/${tr.round.id}/summary`}
                      className="text-xs text-fairway-700 hover:underline font-medium"
                    >
                      Summary →
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
          </div>

          {/* Live leaderboard */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-fairway-900">Leaderboard</h2>
            <TournamentLeaderboard
              tournamentId={id}
              format={tournament.format}
              isActive={true}
            />
          </div>

          {/* Mark complete (organiser only) */}
          {isOrganiser && (
            <form
              action={async () => {
                "use server";
                // Inline server action to mark complete
                const { prisma: db } = await import("@/lib/prisma");
                await db.tournament.update({ where: { id }, data: { status: "COMPLETE" } });
                const { revalidatePath } = await import("next/cache");
                revalidatePath(`/tournaments/${id}`);
              }}
            >
              <button
                type="submit"
                className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                Mark tournament complete
              </button>
            </form>
          )}
        </>
      )}

      {/* ── COMPLETE STATE ── */}
      {tournament.status === "COMPLETE" && (
        <>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-fairway-900">Final Results</h2>
            <TournamentLeaderboard
              tournamentId={id}
              format={tournament.format}
              isActive={false}
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-fairway-900">Round summaries</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {tournament.rounds.map((tr) => (
                <div key={tr.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fairway-800">Group {tr.roundNumber}</p>
                    <p className="text-xs text-gray-400">
                      {tr.round.players.map((p) => p.user.name.split(" ")[0]).join(", ")}
                    </p>
                  </div>
                  <Link
                    href={`/rounds/${tr.round.id}/summary`}
                    className="text-xs text-fairway-700 hover:underline font-medium"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Back link */}
      <Link href="/tournaments" className="block text-sm text-fairway-600 hover:text-fairway-800 transition-colors">
        ← All tournaments
      </Link>
    </div>
  );
}
