import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  calcStrokeplay,
  calcStableford,
  calcSkins,
  type PlayerRoundResult,
} from "@/lib/formats";
import Link from "next/link";

export default async function RoundSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const round = await prisma.round.findUnique({
    where: { id },
    include: {
      course: true,
      tee: { include: { holes: { orderBy: { number: "asc" } } } },
      players: {
        include: {
          user: { select: { id: true, name: true } },
          scores: { orderBy: { holeNumber: "asc" } },
        },
      },
    },
  });
  if (!round) notFound();

  const players: PlayerRoundResult[] = round.players.map((rp) => ({
    playerId: rp.id,
    name: rp.user.name,
    playingHandicap: rp.playingHandicap,
    holes: round.tee.holes.map((hole) => {
      const score = rp.scores.find((s) => s.holeNumber === hole.number);
      return {
        holeNumber: hole.number,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        strokes: score?.strokes ?? 0,
      };
    }),
  }));

  const format = round.format;
  let results: { name: string; score: string; sub?: string }[] = [];
  let winner = "";

  if (format === "STROKEPLAY") {
    const r = calcStrokeplay(players);
    results = r.map((p) => ({
      name: p.name,
      score: `${p.net} net`,
      sub: `${p.gross} gross · ${p.toPar >= 0 ? "+" : ""}${p.toPar} to par`,
    }));
    winner = r[0]?.name ?? "";
  } else if (format === "STABLEFORD") {
    const r = calcStableford(players);
    results = r.map((p) => ({
      name: p.name,
      score: `${p.totalPoints} pts`,
    }));
    winner = r[0]?.name ?? "";
  } else if (format === "SKINS") {
    const r = calcSkins(players);
    results = r.totals.map((t) => ({
      name: t.name,
      score: `${t.skins} skin${t.skins !== 1 ? "s" : ""}`,
    }));
    const top = [...r.totals].sort((a, b) => b.skins - a.skins);
    winner = top[0]?.name ?? "";
  } else {
    results = players.map((p) => ({
      name: p.name,
      score: `${p.holes.reduce((s, h) => s + h.strokes, 0)} gross`,
    }));
  }

  const totalPar = round.tee.par;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fairway-900">Round Summary</h1>
        <p className="text-gray-500 text-sm mt-1">
          {round.course.name} ·{" "}
          {new Date(round.date).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {round.tee.name} Tees · {round.format.replace(/_/g, " ")}
        </p>
      </div>

      {winner && (
        <div className="bg-fairway-900 text-white rounded-2xl p-5 text-center">
          <p className="text-fairway-300 text-xs uppercase tracking-widest mb-1">Winner</p>
          <p className="text-2xl font-bold">🏆 {winner}</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.map((r, i) => (
          <div
            key={r.name}
            className={`flex items-center gap-4 p-4 rounded-xl ${
              i === 0 ? "bg-fairway-800 text-white" : "bg-white border border-fairway-50"
            }`}
          >
            <span className={`text-xl font-bold w-6 ${i === 0 ? "text-fairway-300" : "text-gray-300"}`}>
              {i + 1}
            </span>
            <div className="flex-1">
              <p className={`font-semibold ${i === 0 ? "text-white" : "text-fairway-900"}`}>{r.name}</p>
              {r.sub && <p className={`text-xs ${i === 0 ? "text-fairway-300" : "text-gray-400"}`}>{r.sub}</p>}
            </div>
            <span className={`font-bold text-lg ${i === 0 ? "text-fairway-300" : "text-fairway-700"}`}>
              {r.score}
            </span>
          </div>
        ))}
      </div>

      {/* Full scorecard */}
      <div className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
        <div className="bg-fairway-900 text-white px-4 py-3">
          <h2 className="font-semibold">Full Scorecard — Par {totalPar}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-fairway-100 text-fairway-700">
                <th className="px-2 py-2 text-left sticky left-0 bg-fairway-100">Hole</th>
                <th className="px-2 py-2 text-center">Par</th>
                {round.players.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center">{p.user.name.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {round.tee.holes.map((hole, i) => (
                <tr key={hole.id} className={i % 2 === 0 ? "" : "bg-fairway-50/40"}>
                  <td className="px-2 py-1.5 font-medium text-fairway-800 sticky left-0 bg-inherit">{hole.number}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600">{hole.par}</td>
                  {round.players.map((p) => {
                    const score = p.scores.find((s) => s.holeNumber === hole.number);
                    return (
                      <td key={p.id} className="px-2 py-1.5 text-center">
                        {score ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded ${
                            score.strokes <= hole.par - 2 ? "bg-fairway-900 text-white rounded-full" :
                            score.strokes === hole.par - 1 ? "bg-fairway-500 text-white rounded-full" :
                            score.strokes === hole.par ? "" :
                            score.strokes === hole.par + 1 ? "bg-amber-500 text-white" :
                            "bg-red-600 text-white"
                          }`}>
                            {score.strokes}
                          </span>
                        ) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-fairway-100 font-bold text-fairway-900">
                <td className="px-2 py-2 sticky left-0 bg-fairway-100">Total</td>
                <td className="px-2 py-2 text-center">{totalPar}</td>
                {round.players.map((p) => (
                  <td key={p.id} className="px-2 py-2 text-center">
                    {p.scores.reduce((sum, s) => sum + s.strokes, 0) || "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Link
        href="/dashboard"
        className="block w-full text-center py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
