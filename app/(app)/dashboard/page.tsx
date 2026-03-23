import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, firstName: true, handicapIndex: true },
  });

  const recentRounds = await prisma.round.findMany({
    where: {
      players: { some: { userId } },
      status: "COMPLETE",
    },
    include: {
      course: { select: { name: true } },
      players: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-fairway-900 text-white rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">G&apos;day, {user?.firstName ?? user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-fairway-300 text-sm mt-1">
            Handicap Index:{" "}
            <span className="text-white font-semibold">{user?.handicapIndex?.toFixed(1) ?? "N/A"}</span>
          </p>
        </div>
        <Link
          href="/rounds/new"
          className="bg-fairway-500 hover:bg-fairway-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + New Round
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/rounds/new", icon: "⛳", label: "New Round" },
          { href: "/courses/search", icon: "🔍", label: "Find Course" },
          { href: "/stats", icon: "📊", label: "My Stats" },
          { href: "/tournaments", icon: "🏆", label: "Tournaments" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow border border-fairway-100"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-medium text-fairway-800">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent rounds */}
      <div>
        <h2 className="text-lg font-bold text-fairway-900 mb-3">Recent Rounds</h2>
        {recentRounds.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
            <p className="text-3xl mb-2">⛳</p>
            <p>No rounds yet — time to tee off!</p>
            <Link
              href="/rounds/new"
              className="mt-3 inline-block text-fairway-700 font-medium hover:underline text-sm"
            >
              Start your first round
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRounds.map((round) => (
              <Link
                key={round.id}
                href={`/rounds/${round.id}/summary`}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-fairway-50 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-fairway-900">{round.course.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(round.date).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {round.format.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {round.players.map((p) => p.user.name).join(", ")}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
