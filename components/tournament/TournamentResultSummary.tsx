import Link from "next/link";
import type { TournamentWinner } from "@/lib/tournamentStandings";

export interface PrizeResult {
  holeNumber: number;
  type: "LONGEST_DRIVE" | "NEAREST_PIN";
  winner: { name: string } | null;
}

export interface TournamentResult {
  tournamentId: string;
  winner: TournamentWinner | null;
  prizeHoles: PrizeResult[];
}

function prizeLine(prizes: PrizeResult[]) {
  return prizes
    .filter((p) => p.winner)
    .sort((a, b) => a.holeNumber - b.holeNumber)
    .map((p) => `${p.winner!.name} (H${p.holeNumber})`)
    .join(", ");
}

/** Winner plus Longest Drive / Nearest the Pin winners for a completed event panel. */
export default function TournamentResultSummary({ result }: { result: TournamentResult }) {
  const longestDrive = prizeLine(result.prizeHoles.filter((p) => p.type === "LONGEST_DRIVE"));
  const nearestPin = prizeLine(result.prizeHoles.filter((p) => p.type === "NEAREST_PIN"));

  if (!result.winner && !longestDrive && !nearestPin) return null;

  return (
    <dl className="px-4 py-3 space-y-1.5 text-sm border-b border-fairway-50">
      {result.winner && (
        <div className="flex gap-2">
          <dt className="shrink-0">🏆 <span className="text-gray-500">Winner</span></dt>
          <dd className="font-semibold text-fairway-900">
            {result.winner.name}
            <span className="font-normal text-gray-500"> · {result.winner.detail}</span>
            {result.winner.countbackLabel && (
              <Link
                href={`/tournaments/${result.tournamentId}/countback`}
                className="block text-xs font-normal text-fairway-600 underline underline-offset-2 hover:text-fairway-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded"
              >
                {result.winner.countbackLabel} →
              </Link>
            )}
          </dd>
        </div>
      )}
      {longestDrive && (
        <div className="flex gap-2">
          <dt className="shrink-0">🏌️ <span className="text-gray-500">Longest Drive</span></dt>
          <dd className="font-medium text-gray-800">{longestDrive}</dd>
        </div>
      )}
      {nearestPin && (
        <div className="flex gap-2">
          <dt className="shrink-0">🎯 <span className="text-gray-500">Nearest the Pin</span></dt>
          <dd className="font-medium text-gray-800">{nearestPin}</dd>
        </div>
      )}
    </dl>
  );
}
