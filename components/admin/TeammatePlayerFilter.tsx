"use client";

import { useRouter } from "next/navigation";

/** Narrows the Teammates list to one player (?player=<id>). */
export default function TeammatePlayerFilter({
  players,
  selectedId,
}: {
  players: { id: string; name: string; isGuest: boolean }[];
  selectedId: string | null;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="teammate-player" className="text-sm text-gray-600 shrink-0">
        Player
      </label>
      <select
        id="teammate-player"
        value={selectedId ?? ""}
        onChange={(e) =>
          router.push(e.target.value ? `/admin/teammates?player=${encodeURIComponent(e.target.value)}` : "/admin/teammates")
        }
        className="min-w-0 flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fairway-400"
      >
        <option value="">Everyone</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.isGuest ? " · Guest" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
