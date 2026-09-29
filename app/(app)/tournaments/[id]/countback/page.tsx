import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  calcTournamentStandingsDetailed,
  explainWinnerCountback,
  formatStandingScore,
  standingLabel,
} from "@/lib/tournamentStandings";

const FORMAT_LABELS: Record<string, string> = {
  STROKEPLAY: "Strokeplay",
  STABLEFORD: "Stableford",
  MATCH_PLAY: "Match Play",
  SKINS: "Skins",
  AMBROSE_2: "2-Player Ambrose",
  AMBROSE_4: "4-Player Ambrose",
};

function joinNames(names: string[]) {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default async function CountbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      name: true,
      format: true,
      status: true,
      holesCount: true,
      course: { select: { name: true } },
      rounds: {
        orderBy: { roundNumber: "asc" },
        select: {
          roundNumber: true,
          round: {
            select: {
              id: true,
              tee: { select: { holes: { select: { number: true, strokeIndex: true, par: true } } } },
              players: {
                select: {
                  playingHandicap: true,
                  teamNumber: true,
                  user: { select: { id: true, name: true } },
                  scores: { select: { holeNumber: true, strokes: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!tournament) notFound();

  const { format } = tournament;
  const stableford = format === "STABLEFORD";
  const detailed = calcTournamentStandingsDetailed(tournament.rounds, format, true);
  const explanation = tournament.status === "COMPLETE" ? explainWinnerCountback(detailed) : null;

  const nameOf = new Map(detailed.standings.map((s) => [s.playerId, standingLabel(s, format)]));
  const name = (playerId: string) => nameOf.get(playerId) ?? playerId;
  const total = (value: number) => formatStandingScore(value, format);
  const cell = (value: number | undefined) =>
    value === undefined ? "—" : stableford ? String(value) : formatStandingScore(value, format);

  const backButton = (
    <Link
      href={`/tournaments/${id}`}
      className="block w-full text-center py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
    >
      ← Back to tournament results
    </Link>
  );

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-fairway-900">Countback — {tournament.name}</h1>
      <p className="text-sm text-gray-500 mt-1">
        {FORMAT_LABELS[format] ?? format}
        {tournament.course ? ` · ${tournament.course.name}` : ""} · {tournament.holesCount} holes
      </p>
    </div>
  );

  if (!explanation) {
    return (
      <div className="space-y-6 max-w-xl">
        {header}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-sm text-gray-600">
          {tournament.status === "COMPLETE"
            ? "This event's winner was decided outright — no countback was needed."
            : "Countback is only applied once the event is complete."}
        </div>
        {backButton}
      </div>
    );
  }

  const { tied, trace, tableHoles } = explanation;
  const tiedScore = total(tied[0].score);
  const decidingStep = trace.winnerId ? trace.steps[trace.steps.length - 1] : undefined;
  const decidingHoles = new Set(decidingStep?.holes ?? []);
  const nineHole = detailed.allHoles.length === 9;

  return (
    <div className="space-y-6 max-w-xl">
      {header}

      {/* Why countback was needed */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2 text-sm text-gray-700">
        <h2 className="text-base font-semibold text-fairway-900">Tied on {tiedScore}</h2>
        <p>
          {joinNames(tied.map((s) => standingLabel(s, format)))} finished level on{" "}
          {stableford ? `${tied[0].score} points` : `${tiedScore} net to par`}, so the winner was decided on countback.
        </p>
        <p>
          Countback compares scores over the closing holes in this order:{" "}
          {nineHole ? "the last 5, the last 3" : "the back 9, the last 6, the last 3"}, then the final hole, working
          backwards one hole at a time until one {tied.length > 2 ? "player is ahead of the rest" : "player is ahead"}.{" "}
          {stableford
            ? "In Stableford, the higher points total wins each step."
            : "Scores are compared as net to par, and the lower score wins each step."}
          {tied.length > 2 && " Anyone who falls behind at a step drops out."}
        </p>
      </div>

      {/* Step by step */}
      <ol className="space-y-3">
        {trace.steps.map((step, i) => {
          const leaders = new Set(step.remaining);
          const outcome =
            step.dropped.length === 0
              ? "Still tied"
              : step.remaining.length === 1
                ? `${name(step.remaining[0])} is ahead`
                : `${joinNames(step.dropped.map(name))} ${step.dropped.length === 1 ? "drops" : "drop"} out`;
          return (
            <li key={step.description} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-sm">
              <p className="font-semibold text-fairway-900">
                Step {i + 1} — {step.description}
              </p>
              <p className="mt-1 text-gray-700">
                {step.totals.map((t, j) => (
                  <span key={t.playerId}>
                    {j > 0 && " · "}
                    {name(t.playerId)}{" "}
                    <span className={leaders.has(t.playerId) && step.dropped.length > 0 ? "font-bold text-fairway-800" : ""}>
                      {total(t.total)}
                    </span>
                  </span>
                ))}
              </p>
              <p className="mt-1 text-gray-500 italic">→ {outcome}</p>
            </li>
          );
        })}
      </ol>

      {/* Result */}
      <div className="bg-fairway-900 text-white rounded-2xl p-5 text-center">
        {trace.winnerId && decidingStep ? (
          <p className="text-lg font-bold">
            🏆 {name(trace.winnerId)} wins on countback — {decidingStep.label}
          </p>
        ) : (
          <p className="text-lg font-bold">
            Countback could not separate {joinNames(trace.order.map(name))} — the win is shared
          </p>
        )}
      </div>

      {/* Hole-by-hole working */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-fairway-900 text-white px-4 py-3">
          <h2 className="font-semibold">
            Hole-by-hole {stableford ? "points" : "net to par"} (holes {tableHoles[0]}–{tableHoles[tableHoles.length - 1]})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-fairway-100 text-fairway-700">
                <th className="px-2 py-2 text-left sticky left-0 bg-fairway-100">Hole</th>
                {tableHoles.map((h) => (
                  <th key={h} className={`px-2 py-2 text-center ${decidingHoles.has(h) ? "bg-fairway-200" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trace.order.map((playerId) => (
                <tr key={playerId} className="border-t border-gray-100">
                  <td className="px-2 py-1.5 font-medium text-fairway-800 sticky left-0 bg-white whitespace-nowrap">{name(playerId)}</td>
                  {tableHoles.map((h) => (
                    <td key={h} className={`px-2 py-1.5 text-center ${decidingHoles.has(h) ? "bg-fairway-50 font-semibold" : ""}`}>
                      {cell(detailed.holeValues.get(playerId)?.get(h))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {decidingStep && (
          <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
            The holes used in the deciding step ({decidingStep.description.replace(/^.*\((.*)\)$/, "$1")}) are highlighted.
          </p>
        )}
      </div>

      {backButton}
    </div>
  );
}
