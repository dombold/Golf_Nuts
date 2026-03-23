import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    include: {
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

      {tournaments.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
          <p className="text-3xl mb-2">🏆</p>
          <p className="mb-3">No tournaments yet</p>
          <Link href="/tournaments/new" className="text-fairway-700 font-medium hover:underline text-sm">
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
              <div className={`px-4 py-3 flex items-center justify-between ${
                t.status === "ACTIVE" ? "bg-fairway-700 text-white" : "bg-fairway-50"
              }`}>
                <div>
                  <h2 className={`font-bold ${t.status === "ACTIVE" ? "text-white" : "text-fairway-900"}`}>
                    {t.name}
                  </h2>
                  <p className={`text-xs ${t.status === "ACTIVE" ? "text-fairway-200" : "text-gray-500"}`}>
                    {t.format.replace(/_/g, " ")} · {t.rounds.length} round{t.rounds.length !== 1 ? "s" : ""}
                  </p>
                </div>
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
              {t.rounds.length > 0 && (
                <div className="divide-y divide-fairway-50">
                  {t.rounds.map((tr) => (
                    <div key={tr.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-fairway-800">
                          Round {tr.roundNumber} — {tr.round.course.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(tr.round.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} ·{" "}
                          {tr.round.players.map((p) => p.user.name.split(" ")[0]).join(", ")}
                        </p>
                      </div>
                      {tr.round.status === "COMPLETE" ? (
                        <Link
                          href={`/rounds/${tr.round.id}/summary`}
                          className="text-xs text-fairway-700 hover:underline"
                        >
                          View →
                        </Link>
                      ) : (
                        <Link
                          href={`/rounds/${tr.round.id}/score`}
                          className="text-xs bg-fairway-100 text-fairway-700 px-2 py-1 rounded-lg hover:bg-fairway-200"
                        >
                          Score →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
