"use client";

import { useState } from "react";
import Link from "next/link";
import type { Prisma } from "@/app/generated/prisma/client";
import TournamentResultSummary, { type TournamentResult } from "@/components/tournament/TournamentResultSummary";

type PastTournament = Prisma.TournamentGetPayload<{
  include: {
    course: { select: { name: true } };
    createdBy: { select: { name: true } };
    rounds: {
      include: {
        round: {
          include: {
            course: { select: { name: true } };
            players: { include: { user: { select: { name: true } } } };
          };
        };
      };
      orderBy: { roundNumber: "asc" };
    };
  };
}>;

interface Props {
  pastTournaments: PastTournament[];
  /** Winner and prize winners, keyed by tournament id */
  results: Record<string, TournamentResult>;
}

export default function PastTournamentsDropdown({ pastTournaments, results }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-fairway-50 hover:bg-fairway-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        aria-expanded={open}
      >
        <span className="font-semibold text-fairway-900 text-sm">
          Previous Events ({pastTournaments.length})
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 text-fairway-700 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {pastTournaments.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
              <Link href={`/tournaments/${t.id}`} className="block">
                <div className="px-4 py-3 flex items-center justify-between bg-fairway-50">
                  <div>
                    <h2 className="font-bold text-fairway-900">{t.name}</h2>
                    <p className="text-xs text-gray-500">
                      {t.format.replace(/_/g, " ")}
                      {t.course ? ` · ${t.course.name}` : ""}
                      {" · "}by {t.createdBy.name}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    COMPLETE
                  </span>
                </div>
              </Link>

              {results[t.id] && <TournamentResultSummary result={results[t.id]} />}

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
                      <Link
                        href={`/rounds/${tr.round.id}/summary`}
                        className="text-xs text-fairway-700 hover:underline font-medium"
                      >
                        View →
                      </Link>
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
