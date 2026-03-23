import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HandicapChart from "./HandicapChart";

export default async function StatsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, handicapIndex: true },
  });

  const [history, rounds] = await Promise.all([
    prisma.handicapHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    prisma.round.findMany({
      where: {
        players: { some: { userId } },
        status: "COMPLETE",
      },
      include: {
        course: { select: { name: true } },
        tee: { select: { par: true } },
        players: {
          where: { userId },
          include: { scores: true },
        },
      },
      orderBy: { date: "desc" },
      take: 20,
    }),
  ]);

  const statsRows = rounds.map((round) => {
    const rp = round.players[0];
    if (!rp) return null;
    const gross = rp.scores.reduce((s, sc) => s + sc.strokes, 0);
    const fairways = rp.scores.filter((s) => s.fairwayHit === true).length;
    const fairwayAttempts = rp.scores.filter((s) => s.fairwayHit !== null).length;
    const girs = rp.scores.filter((s) => s.gir === true).length;
    const putts = rp.scores.reduce((s, sc) => s + (sc.putts ?? 0), 0);
    return {
      date: round.date,
      course: round.course.name,
      gross,
      toPar: gross - round.tee.par,
      fairwayPct: fairwayAttempts > 0 ? Math.round((fairways / fairwayAttempts) * 100) : null,
      girPct: Math.round((girs / Math.max(rp.scores.length, 1)) * 100),
      avgPutts: rp.scores.length > 0 ? (putts / rp.scores.length).toFixed(1) : null,
    };
  }).filter(Boolean);

  const chartData = history.map((h) => ({
    date: new Date(h.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short" }),
    index: h.index,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fairway-900">My Stats</h1>
        <div className="text-right">
          <p className="text-3xl font-bold text-fairway-700">{user?.handicapIndex?.toFixed(1)}</p>
          <p className="text-xs text-gray-400">Handicap Index</p>
        </div>
      </div>

      {/* Summary cards */}
      {statsRows.length > 0 && (() => {
        const validRows = statsRows.filter((r) => r !== null);
        const avgGross = validRows.length
          ? Math.round(validRows.reduce((s, r) => s + r!.gross, 0) / validRows.length)
          : 0;
        const avgFairway = validRows.filter((r) => r!.fairwayPct !== null).length
          ? Math.round(validRows.filter((r) => r!.fairwayPct !== null).reduce((s, r) => s + r!.fairwayPct!, 0) / validRows.filter((r) => r!.fairwayPct !== null).length)
          : null;
        const avgGir = Math.round(validRows.reduce((s, r) => s + r!.girPct, 0) / validRows.length);

        return (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Avg Score", value: avgGross.toString(), sub: "gross" },
              { label: "Fairways", value: avgFairway !== null ? `${avgFairway}%` : "—", sub: "avg hit" },
              { label: "GIR", value: `${avgGir}%`, sub: "avg" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-fairway-50">
                <p className="text-2xl font-bold text-fairway-700">{stat.value}</p>
                <p className="text-xs font-medium text-fairway-900 mt-0.5">{stat.label}</p>
                <p className="text-xs text-gray-400">{stat.sub}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Handicap trend chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-fairway-50">
          <h2 className="font-semibold text-fairway-800 mb-3">Handicap Trend</h2>
          <HandicapChart data={chartData} />
        </div>
      )}

      {/* Recent rounds table */}
      {statsRows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
          <div className="bg-fairway-900 text-white px-4 py-3">
            <h2 className="font-semibold">Recent Rounds</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-fairway-50 text-fairway-700">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Course</th>
                  <th className="px-3 py-2 text-center">Score</th>
                  <th className="px-3 py-2 text-center">FIR%</th>
                  <th className="px-3 py-2 text-center">GIR%</th>
                  <th className="px-3 py-2 text-center">Putts</th>
                </tr>
              </thead>
              <tbody>
                {statsRows.map((r, i) =>
                  r ? (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-fairway-50/40"}>
                      <td className="px-3 py-1.5 text-gray-500">
                        {new Date(r.date).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-3 py-1.5 text-fairway-800 max-w-24 truncate">{r.course}</td>
                      <td className="px-3 py-1.5 text-center font-medium">
                        {r.gross} ({r.toPar >= 0 ? "+" : ""}{r.toPar})
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{r.fairwayPct !== null ? `${r.fairwayPct}%` : "—"}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{r.girPct}%</td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{r.avgPutts ?? "—"}</td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {statsRows.length === 0 && (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
          <p className="text-3xl mb-2">📊</p>
          <p>Complete rounds to see your stats</p>
        </div>
      )}
    </div>
  );
}
