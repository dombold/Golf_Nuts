import React from "react";

/** One scorecard column: a player, or a team in team games (every member carries the same scramble score) */
export interface ScoreColumn {
  key: string;
  label: string;
  sub?: string;
  guest?: boolean;
  /** Round-player id — only player columns can win a skin */
  playerId?: string;
  strokes: (holeNumber: number) => number | undefined;
}

interface FullScorecardProps {
  holes: { id: string; number: number; par: number }[];
  columns: ScoreColumn[];
  /** Skins: which player won each hole's skin, and what it was worth */
  skinWins?: Map<number, { winnerId: string; value: number }>;
  /** Match Play: who won each hole — adds a "Hole won" column */
  matchHoleLabel?: (holeNumber: number) => string;
  /** Skins: show the carry-over legend under the title */
  showSkinsLegend?: boolean;
  skinsCarryOver?: boolean;
  /** Mid-round: highlight the hole being played */
  currentHole?: number;
  /** Mid-round: hole numbers become buttons that jump to that hole */
  onHoleClick?: (holeNumber: number) => void;
}

function scoreClass(strokes: number, par: number) {
  if (strokes <= par - 2) return "bg-fairway-900 text-white rounded-full";
  if (strokes === par - 1) return "bg-fairway-500 text-white rounded-full";
  if (strokes === par) return "";
  if (strokes === par + 1) return "bg-amber-500 text-white";
  return "bg-red-600 text-white";
}

export default function FullScorecard({
  holes,
  columns,
  skinWins,
  matchHoleLabel,
  showSkinsLegend,
  skinsCarryOver,
  currentHole,
  onHoleClick,
}: FullScorecardProps) {
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const frontNineHoles = holes.filter((h) => h.number <= 9);
  const backNineHoles = holes.filter((h) => h.number >= 10);
  const frontPar = frontNineHoles.reduce((s, h) => s + h.par, 0);
  const backPar = backNineHoles.reduce((s, h) => s + h.par, 0);
  const columnTotal = (c: ScoreColumn, hs: { number: number }[]) =>
    hs.reduce((sum, h) => sum + (c.strokes(h.number) ?? 0), 0);
  const showMatch = !!matchHoleLabel;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
      <div className="bg-fairway-900 text-white px-4 py-3">
        <h2 className="font-semibold">Full Scorecard — Par {totalPar}</h2>
        {showSkinsLegend && (
          <p className="text-xs text-fairway-300 mt-0.5">
            {skinsCarryOver ? "Halved holes carry over" : "No carry-over"} ·{" "}
            <span className="text-green-400 font-bold">✓</span> won the skin
          </p>
        )}
        {onHoleClick && <p className="text-xs text-fairway-300 mt-0.5">Tap a hole number to score it</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-fairway-100 text-fairway-700">
              <th className="px-2 py-2 text-left sticky left-0 bg-fairway-100">Hole</th>
              <th className="px-2 py-2 text-center">Par</th>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-2 py-2 text-center align-bottom">
                  {c.label}
                  {c.guest && <span className="sr-only"> (guest)</span>}
                  {c.sub && <span className="block text-[10px] font-normal text-fairway-600">{c.sub}</span>}
                </th>
              ))}
              {showMatch && <th className="px-2 py-2 text-center">Hole won</th>}
            </tr>
          </thead>
          <tbody>
            {holes.map((hole, i) => {
              const isCurrent = hole.number === currentHole;
              return (
                <React.Fragment key={hole.id}>
                  <tr
                    aria-current={isCurrent ? "true" : undefined}
                    className={isCurrent ? "bg-acorn-100 font-semibold" : i % 2 === 0 ? "" : "bg-fairway-50/40"}
                  >
                    <td className="px-2 py-1.5 font-medium text-fairway-800 sticky left-0 bg-inherit">
                      {onHoleClick ? (
                        <button
                          type="button"
                          onClick={() => onHoleClick(hole.number)}
                          aria-label={`Score hole ${hole.number}`}
                          className="min-w-7 h-7 px-1 rounded-md underline decoration-fairway-300 underline-offset-2 hover:bg-fairway-100 active:bg-fairway-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
                        >
                          {hole.number}
                        </button>
                      ) : (
                        hole.number
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-600">{hole.par}</td>
                    {columns.map((c) => {
                      const strokes = c.strokes(hole.number);
                      const skin = skinWins?.get(hole.number);
                      const wonSkin = !!c.playerId && skin?.winnerId === c.playerId;
                      return (
                        <td key={c.key} className="px-2 py-1.5 text-center whitespace-nowrap">
                          {strokes ? (
                            <>
                              <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded ${scoreClass(strokes, hole.par)}`}>
                                {strokes}
                              </span>
                              {wonSkin && skin && (
                                <span
                                  className="ml-0.5 text-green-600 font-bold"
                                  aria-label={skin.value > 1 ? `won ${skin.value} skins` : "won the skin"}
                                  title={skin.value > 1 ? `Won ${skin.value} skins` : "Won the skin"}
                                >
                                  ✓{skin.value > 1 && <span className="text-[10px]">{skin.value}</span>}
                                </span>
                              )}
                            </>
                          ) : "—"}
                        </td>
                      );
                    })}
                    {showMatch && (
                      <td className="px-2 py-1.5 text-center text-fairway-800 font-medium">{matchHoleLabel(hole.number)}</td>
                    )}
                  </tr>
                  {hole.number === 9 && frontNineHoles.length > 0 && (
                    <tr className="bg-fairway-200/60 font-semibold text-fairway-900 border-t-2 border-fairway-300">
                      <td className="px-2 py-1.5 sticky left-0 bg-fairway-200/60">Out</td>
                      <td className="px-2 py-1.5 text-center">{frontPar}</td>
                      {columns.map((c) => (
                        <td key={c.key} className="px-2 py-1.5 text-center">
                          {columnTotal(c, frontNineHoles) || "—"}
                        </td>
                      ))}
                      {showMatch && <td />}
                    </tr>
                  )}
                  {hole.number === backNineHoles[backNineHoles.length - 1]?.number && backNineHoles.length > 0 && (
                    <tr className="bg-fairway-200/60 font-semibold text-fairway-900 border-t-2 border-fairway-300">
                      <td className="px-2 py-1.5 sticky left-0 bg-fairway-200/60">In</td>
                      <td className="px-2 py-1.5 text-center">{backPar}</td>
                      {columns.map((c) => (
                        <td key={c.key} className="px-2 py-1.5 text-center">
                          {columnTotal(c, backNineHoles) || "—"}
                        </td>
                      ))}
                      {showMatch && <td />}
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            <tr className="bg-fairway-100 font-bold text-fairway-900">
              <td className="px-2 py-2 sticky left-0 bg-fairway-100">Total</td>
              <td className="px-2 py-2 text-center">{totalPar}</td>
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-2 text-center">
                  {columnTotal(c, holes) || "—"}
                </td>
              ))}
              {showMatch && <td />}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
