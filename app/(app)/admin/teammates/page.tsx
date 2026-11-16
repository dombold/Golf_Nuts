import { prisma } from "@/lib/prisma";
import { countTeammatePairs } from "@/lib/teammatePairs";
import GuestBadge from "@/components/guests/GuestBadge";
import TeammatePlayerFilter from "@/components/admin/TeammatePlayerFilter";

interface Person {
  id: string;
  name: string;
  isGuest: boolean;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function Name({ person }: { person: Person }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="break-words">{person.name}</span>
      {person.isGuest && <GuestBadge />}
    </span>
  );
}

/** How often each pair of players has been on the same team in started events. */
export default async function AdminTeammatesPage({ searchParams }: { searchParams: Promise<{ player?: string }> }) {
  const { player } = await searchParams;

  const [eventRounds, members] = await Promise.all([
    prisma.tournamentRound.findMany({
      where: { tournament: { status: { in: ["ACTIVE", "COMPLETE"] } } },
      select: {
        round: {
          select: {
            format: true,
            stablefordTeamSize: true,
            date: true,
            players: {
              select: { userId: true, teamNumber: true, user: { select: { id: true, name: true, isGuest: true } } },
            },
          },
        },
      },
    }),
    prisma.user.findMany({ where: { isGuest: false }, select: { id: true, name: true, isGuest: true } }),
  ]);

  const rounds = eventRounds.map((tr) => tr.round);
  const pairs = countTeammatePairs(rounds);

  // Everyone who could be listed: all members, plus guests who have played in an event
  const people = new Map<string, Person>(members.map((m) => [m.id, m]));
  for (const r of rounds) for (const rp of r.players) people.set(rp.user.id, rp.user);
  const sortedPeople = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  const person = (id: string): Person => people.get(id) ?? { id, name: "Unknown", isGuest: false };

  const selected = player && people.has(player) ? person(player) : null;

  const rows = (selected ? pairs.filter((p) => p.aId === selected.id || p.bId === selected.id) : pairs)
    .map((p) => {
      const a = person(p.aId);
      const b = person(p.bId);
      // With a player selected, show them first so the list reads as "their teammates"
      const [first, second] = selected && b.id === selected.id ? [b, a] : [a, b];
      return { ...p, first, second };
    })
    .sort(
      (x, y) =>
        y.count - x.count ||
        x.first.name.localeCompare(y.first.name) ||
        x.second.name.localeCompare(y.second.name)
    );

  const teamedWith = new Set(rows.flatMap((r) => [r.first.id, r.second.id]));
  const neverTeamed = selected
    ? sortedPeople.filter((p) => p.id !== selected.id && !p.isGuest && !teamedWith.has(p.id))
    : [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        How many times players have been on the same team in started events. Only team games (Ambrose and
        team Stableford) count. Casual rounds don&apos;t.
      </p>

      <TeammatePlayerFilter players={sortedPeople} selectedId={selected?.id ?? null} />

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          {selected ? `${selected.name} hasn't played on a team in an event yet.` : "No team events played yet."}
        </p>
      ) : (
        <ul className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {rows.map((r) => (
            <li key={`${r.aId}|${r.bId}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  <Name person={r.first} /> <span className="text-gray-400">&amp;</span> <Name person={r.second} />
                </p>
                <p className="text-xs text-gray-500">Last together {formatDate(r.lastPlayed)}</p>
              </div>
              <span
                className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-fairway-100 text-fairway-800"
                aria-label={`${r.count} time${r.count !== 1 ? "s" : ""}`}
              >
                {r.count}×
              </span>
            </li>
          ))}
        </ul>
      )}

      {selected && neverTeamed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-fairway-900">Never teamed with {selected.name}</h2>
          <div className="flex flex-wrap gap-2">
            {neverTeamed.map((p) => (
              <span key={p.id} className="text-sm text-gray-700 bg-gray-100 rounded-lg px-2 py-1">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
