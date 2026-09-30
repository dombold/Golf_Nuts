import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  calcStrokeplay,
  calcStableford,
  calcSkins,
  calcAmbrose,
  calcMatchPlay,
  calcStablefordTeams,
  type MatchPlayResult,
  type PlayerRoundResult,
  type AmbroseTeam,
} from "@/lib/formats";
import Link from "next/link";
import { skinsGroupWinnerLabel } from "@/lib/tournamentStandings";
import { formatDisplayLabel, isTeamGame } from "@/lib/gameFormats";
import { joinNames } from "@/lib/teams";
import DeleteRoundButton from "@/components/DeleteRoundButton";
import GuestBadge from "@/components/guests/GuestBadge";
import GuestRow from "@/components/guests/GuestRow";
import { auth } from "@/lib/auth";

export default async function RoundSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const round = await prisma.round.findUnique({
    where: { id },
    include: {
      course: true,
      tee: { include: { holes: { orderBy: { number: "asc" } } } },
      players: {
        include: {
          user: { select: { id: true, name: true, handicapIndex: true, isGuest: true } },
          scores: { orderBy: { holeNumber: "asc" } },
        },
      },
      tournamentRounds: {
        take: 1,
        select: {
          roundNumber: true,
          tournament: { select: { id: true, _count: { select: { rounds: true } } } },
        },
      },
    },
  });
  if (!round) notFound();

  // In a multi-group tournament there is one overall winner, decided across all groups —
  // so this round's summary shows group results only, with no winner. Skins is the exception:
  // each group plays its own skins game, so each group has its own winner.
  const tournamentRound = round.tournamentRounds[0];
  const isMultiGroupEvent = (tournamentRound?.tournament._count.rounds ?? 0) > 1;

  // Guest players: badge by round-player id; the round's creator can assign a casual round's guests
  // to a member (event guests are managed from the event page)
  const guestPlayers = round.players.filter((rp) => rp.user.isGuest);
  const guestRoundPlayerIds = new Set(guestPlayers.map((rp) => rp.id));
  const canManageGuests = !tournamentRound && !!session?.user && round.createdById === session.user.id;

  const playedHoles = round.tee.holes.filter(
    (h) => h.number >= round.startingHole && h.number < round.startingHole + round.holesCount
  );

  const players: PlayerRoundResult[] = round.players.map((rp) => ({
    playerId: rp.id,
    name: rp.user.name,
    playingHandicap: rp.playingHandicap,
    holes: playedHoles.map((hole) => {
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
  const showsOwnWinner = !isMultiGroupEvent || format === "SKINS";
  // `lead` marks the row(s) to highlight when it isn't simply the first row (e.g. a Skins tie)
  let results: { id: string; name: string; score: string; sub?: string; lead?: boolean; rank?: number }[] = [];
  let match: MatchPlayResult | null = null;
  // Skins: which player won each hole's skin, and what it was worth (for the scorecard ticks)
  const skinWins = new Map<number, { winnerId: string; value: number }>();
  let winner = "";
  let winnerCountbackLabel: string | undefined;

  // Team games (Ambrose, team Stableford) are scrambles: one team score per hole
  const teamGame = isTeamGame(format, round.stablefordTeamSize);
  const roundPlayers = round.players;
  function buildTeams(): AmbroseTeam[] {
    const teamMap = new Map<number, typeof roundPlayers>();
    for (const rp of roundPlayers) {
      const tn = rp.teamNumber ?? 0;
      teamMap.set(tn, [...(teamMap.get(tn) ?? []), rp]);
    }
    return [...teamMap].sort((a, b) => a[0] - b[0]).map(([teamNumber, members]) => ({
      teamId: `team-${teamNumber}`,
      name: joinNames(members.map((m) => m.user.name.split(" ")[0])) + ` (Team ${teamNumber})`,
      players: members.map((rp) => ({
        playerId: rp.id,
        name: rp.user.name,
        playingHandicap: rp.playingHandicap,
        holes: playedHoles.map((hole) => ({
          holeNumber: hole.number,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          strokes: rp.scores.find((sc) => sc.holeNumber === hole.number)?.strokes ?? 0,
        })),
      })),
      // Scramble: one team score per hole (recorded against each member); 0 when nobody has scored it
      teamHoles: playedHoles.map((hole) => {
        const entered = members
          .map((rp) => rp.scores.find((sc) => sc.holeNumber === hole.number)?.strokes ?? 0)
          .filter((st) => st > 0);
        return {
          holeNumber: hole.number,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          strokes: entered.length ? Math.min(...entered) : 0,
        };
      }),
    }));
  }

  if (format === "STROKEPLAY") {
    const r = calcStrokeplay(players);
    results = r.map((p) => ({
      id: p.playerId,
      name: p.name,
      score: `${p.net} net`,
      sub: [
        `${p.gross} gross`,
        `${p.toPar >= 0 ? "+" : ""}${p.toPar} to par`,
        p.countbackLabel,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
    winner = r[0]?.name ?? "";
    winnerCountbackLabel = r[0]?.countbackLabel;
  } else if (format === "STABLEFORD" && teamGame) {
    const r = calcStablefordTeams(buildTeams());
    results = r.map((t) => ({
      id: t.teamId,
      name: t.name,
      score: `${t.totalPoints} pts`,
      sub: [`Hcp ${t.teamHandicap}`, t.countbackLabel].filter(Boolean).join(" · "),
    }));
    winner = r[0]?.name ?? "";
    winnerCountbackLabel = r[0]?.countbackLabel;
  } else if (format === "STABLEFORD") {
    const r = calcStableford(players);
    results = r.map((p) => ({
      id: p.playerId,
      name: p.name,
      score: `${p.totalPoints} pts`,
      sub: p.countbackLabel,
    }));
    winner = r[0]?.name ?? "";
    winnerCountbackLabel = r[0]?.countbackLabel;
  } else if (format === "SKINS") {
    const skinsResult = calcSkins(players, { carryOver: round.skinsCarryOver });
    for (const skin of skinsResult.skins) {
      if (skin.winnerId) skinWins.set(skin.holeNumber, { winnerId: skin.winnerId, value: skin.value });
    }
    const totals = [...skinsResult.totals].sort((a, b) => b.skins - a.skins || a.name.localeCompare(b.name));
    const top = totals[0]?.skins ?? 0;
    // Everyone level on the most skins shares the win; nobody wins with 0 skins
    const winners = top > 0 ? totals.filter((t) => t.skins === top).map((t) => t.name) : [];
    results = totals.map((t) => ({
      id: t.playerId,
      name: t.name,
      score: `${t.skins} skin${t.skins !== 1 ? "s" : ""}`,
      lead: top > 0 && t.skins === top,
      // Level on skins = same position
      rank: 1 + totals.filter((o) => o.skins > t.skins).length,
    }));
    winner = skinsGroupWinnerLabel({ winners, totals }) ?? "";
  } else if (format === "AMBROSE_2" || format === "AMBROSE_4") {
    const teams = buildTeams();
    const r = calcAmbrose(teams);
    results = r.map((t) => ({
      id: t.teamId,
      name: t.name,
      score: `${t.net} net`,
      sub: [
        `${t.gross} gross`,
        `Hcp ${t.teamHandicap}`,
        t.countbackLabel,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
    winner = r[0]?.name ?? "";
    winnerCountbackLabel = r[0]?.countbackLabel;
  } else if (format === "MATCH_PLAY" && players.length === 2) {
    const [p1, p2] = players;
    match = calcMatchPlay(p1, p2, playedHoles.length);
    const won = (who: "player1" | "player2") => match!.holes.filter((h) => h.result === who).length;
    results = [
      { id: p1.playerId, name: p1.name, score: `${won("player1")} won`, sub: `Hcp ${p1.playingHandicap}` },
      { id: p2.playerId, name: p2.name, score: `${won("player2")} won`, sub: `Hcp ${p2.playingHandicap}` },
    ].sort((a, b) => parseInt(b.score) - parseInt(a.score));
    winner = match.status;
  } else {
    results = players.map((p) => ({
      id: p.playerId,
      name: p.name,
      score: `${p.holes.reduce((s, h) => s + h.strokes, 0)} gross`,
    }));
  }

  const matchHoleLabel = (holeNumber: number) => {
    const result = match?.holes.find((h) => h.holeNumber === holeNumber)?.result;
    if (!result) return "—";
    if (result === "halved") return "½";
    return players[result === "player1" ? 0 : 1].name.split(" ")[0];
  };

  const totalPar = playedHoles.reduce((sum, h) => sum + h.par, 0);
  const frontNineHoles = playedHoles.filter((h) => h.number <= 9);
  const backNineHoles = playedHoles.filter((h) => h.number >= 10);
  const frontPar = frontNineHoles.reduce((s, h) => s + h.par, 0);
  const backPar = backNineHoles.reduce((s, h) => s + h.par, 0);
  const playerFront = (p: (typeof round.players)[0]) =>
    p.scores.filter((s) => s.holeNumber <= 9).reduce((sum, s) => sum + s.strokes, 0);
  const playerBack = (p: (typeof round.players)[0]) =>
    p.scores.filter((s) => s.holeNumber >= 10).reduce((sum, s) => sum + s.strokes, 0);

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
          · {round.tee.name} Tees · {formatDisplayLabel(round.format, round.stablefordTeamSize)}
        </p>
      </div>

      {isMultiGroupEvent && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-fairway-900">Group {tournamentRound.roundNumber} results</h2>
          <Link
            href={`/tournaments/${tournamentRound.tournament.id}`}
            className="text-sm text-fairway-700 hover:underline font-medium"
          >
            View tournament results →
          </Link>
        </div>
      )}

      {winner && showsOwnWinner && (
        <div className="bg-fairway-900 text-white rounded-2xl p-5 text-center">
          <p className="text-fairway-300 text-xs uppercase tracking-widest mb-1">
            {match
              ? (match.finished ? "Result" : "Match status")
              : isMultiGroupEvent ? `Group ${tournamentRound.roundNumber} winner` : "Winner"}
          </p>
          <p className="text-2xl font-bold">{match && !match.winner ? winner : `🏆 ${winner}`}</p>
          {winnerCountbackLabel && (
            <p className="text-fairway-400 text-xs mt-1">{winnerCountbackLabel}</p>
          )}
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.map((r, index) => {
          // Only highlight the leader(s) when this round decides a winner
          const highlight = showsOwnWinner && (r.lead ?? index === 0);
          return (
          <div
            key={r.id}
            className={`flex items-center gap-4 p-4 rounded-xl ${
              highlight ? "bg-fairway-800 text-white" : "bg-white border border-fairway-50"
            }`}
          >
            <span className={`text-xl font-bold w-6 ${highlight ? "text-fairway-300" : "text-gray-300"}`}>
              {r.rank ?? index + 1}
            </span>
            <div className="flex-1">
              <p className={`font-semibold ${highlight ? "text-white" : "text-fairway-900"}`}>
                {r.name}
                {guestRoundPlayerIds.has(r.id) && <GuestBadge className="ml-2" />}
              </p>
              {r.sub && <p className={`text-xs ${highlight ? "text-fairway-300" : "text-gray-400"}`}>{r.sub}</p>}
            </div>
            <span className={`font-bold text-lg ${highlight ? "text-fairway-300" : "text-fairway-700"}`}>
              {r.score}
            </span>
          </div>
          );
        })}
      </div>

      {/* Full scorecard */}
      <div className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
        <div className="bg-fairway-900 text-white px-4 py-3">
          <h2 className="font-semibold">Full Scorecard — Par {totalPar}</h2>
          {format === "SKINS" && (
            <p className="text-xs text-fairway-300 mt-0.5">
              {round.skinsCarryOver ? "Halved holes carry over" : "No carry-over"} ·{" "}
              <span className="text-green-400 font-bold">✓</span> won the skin
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-fairway-100 text-fairway-700">
                <th className="px-2 py-2 text-left sticky left-0 bg-fairway-100">Hole</th>
                <th className="px-2 py-2 text-center">Par</th>
                {round.players.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center">
                    {p.user.name.split(" ")[0]}
                    {p.user.isGuest && <span className="sr-only"> (guest)</span>}
                  </th>
                ))}
                {match && <th className="px-2 py-2 text-center">Hole won</th>}
              </tr>
            </thead>
            <tbody>
              {playedHoles.map((hole, i) => (
                <React.Fragment key={hole.id}>
                  <tr className={i % 2 === 0 ? "" : "bg-fairway-50/40"}>
                    <td className="px-2 py-1.5 font-medium text-fairway-800 sticky left-0 bg-inherit">{hole.number}</td>
                    <td className="px-2 py-1.5 text-center text-gray-600">{hole.par}</td>
                    {round.players.map((p) => {
                      const score = p.scores.find((s) => s.holeNumber === hole.number);
                      const skin = skinWins.get(hole.number);
                      const wonSkin = skin?.winnerId === p.id;
                      return (
                        <td key={p.id} className="px-2 py-1.5 text-center whitespace-nowrap">
                          {score ? (
                            <>
                            <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded ${
                              score.strokes <= hole.par - 2 ? "bg-fairway-900 text-white rounded-full" :
                              score.strokes === hole.par - 1 ? "bg-fairway-500 text-white rounded-full" :
                              score.strokes === hole.par ? "" :
                              score.strokes === hole.par + 1 ? "bg-amber-500 text-white" :
                              "bg-red-600 text-white"
                            }`}>
                              {score.strokes}
                            </span>
                            {wonSkin && (
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
                    {match && (
                      <td className="px-2 py-1.5 text-center text-fairway-800 font-medium">{matchHoleLabel(hole.number)}</td>
                    )}
                  </tr>
                  {hole.number === 9 && frontNineHoles.length > 0 && (
                    <tr className="bg-fairway-200/60 font-semibold text-fairway-900 border-t-2 border-fairway-300">
                      <td className="px-2 py-1.5 sticky left-0 bg-fairway-200/60">Out</td>
                      <td className="px-2 py-1.5 text-center">{frontPar}</td>
                      {round.players.map((p) => (
                        <td key={p.id} className="px-2 py-1.5 text-center">
                          {playerFront(p) || "—"}
                        </td>
                      ))}
                      {match && <td />}
                    </tr>
                  )}
                  {hole.number === backNineHoles[backNineHoles.length - 1]?.number && backNineHoles.length > 0 && (
                    <tr className="bg-fairway-200/60 font-semibold text-fairway-900 border-t-2 border-fairway-300">
                      <td className="px-2 py-1.5 sticky left-0 bg-fairway-200/60">In</td>
                      <td className="px-2 py-1.5 text-center">{backPar}</td>
                      {round.players.map((p) => (
                        <td key={p.id} className="px-2 py-1.5 text-center">
                          {playerBack(p) || "—"}
                        </td>
                      ))}
                      {match && <td />}
                    </tr>
                  )}
                </React.Fragment>
              ))}
              <tr className="bg-fairway-100 font-bold text-fairway-900">
                <td className="px-2 py-2 sticky left-0 bg-fairway-100">Total</td>
                <td className="px-2 py-2 text-center">{totalPar}</td>
                {round.players.map((p) => (
                  <td key={p.id} className="px-2 py-2 text-center">
                    {p.scores.reduce((sum, s) => sum + s.strokes, 0) || "—"}
                  </td>
                ))}
                {match && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {canManageGuests && guestPlayers.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-fairway-900">Guest players</h2>
          <p className="text-xs text-gray-500">If a guest registers, assign their scores to their new account.</p>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {guestPlayers.map((rp) => (
              <GuestRow key={rp.id} guest={rp.user} canAssign canRemove={rp.scores.length === 0} canAnonymise />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="flex-1 text-center py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <Link
          href={`/rounds/${id}/score`}
          className="flex-1 text-center py-3 bg-white border border-fairway-200 text-fairway-800 rounded-xl font-semibold hover:bg-fairway-50 transition-colors"
        >
          Edit Scores
        </Link>
        <DeleteRoundButton roundId={id} />
      </div>
    </div>
  );
}
