"use client";

import { useState } from "react";

interface Player {
  id: string;
  name: string;
  username: string;
  handicapIndex: number;
}

interface GroupMember {
  userId: string;
  teamNumber?: number;
}

interface Group {
  groupNumber: number;
  teeId: string;
  members: GroupMember[];
}

interface Tee {
  id: string;
  name: string;
}

interface Props {
  acceptedPlayers: Player[];
  initialGroups: Group[];
  tees: Tee[];
  defaultTeeId: string;
  format: string;
  tournamentId: string;
}

const isAmbrose2 = (f: string) => f === "AMBROSE_2";

export default function GroupBuilder({
  acceptedPlayers,
  initialGroups,
  tees,
  defaultTeeId,
  format,
  tournamentId,
}: Props) {
  const [groups, setGroups] = useState<Group[]>(
    initialGroups.length > 0
      ? initialGroups
      : [{ groupNumber: 1, teeId: defaultTeeId, members: [] }]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Players not yet assigned to any group
  const assignedIds = new Set(groups.flatMap((g) => g.members.map((m) => m.userId)));
  const unassigned = acceptedPlayers.filter((p) => !assignedIds.has(p.id));

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      {
        groupNumber: prev.length + 1,
        teeId: defaultTeeId,
        members: [],
      },
    ]);
    setSaved(false);
  }

  function removeGroup(index: number) {
    setGroups((prev) => {
      const next = prev.filter((_, i) => i !== index).map((g, i) => ({
        ...g,
        groupNumber: i + 1,
      }));
      return next;
    });
    setSaved(false);
  }

  function addToGroup(groupIndex: number, playerId: string) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g;
        if (g.members.length >= 4) return g;
        const teamNumber = isAmbrose2(format) ? 1 : undefined;
        return { ...g, members: [...g.members, { userId: playerId, teamNumber }] };
      })
    );
    setSaved(false);
  }

  function removeFromGroup(groupIndex: number, playerId: string) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g;
        return { ...g, members: g.members.filter((m) => m.userId !== playerId) };
      })
    );
    setSaved(false);
  }

  function setTeamNumber(groupIndex: number, playerId: string, teamNumber: number) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g;
        return {
          ...g,
          members: g.members.map((m) =>
            m.userId === playerId ? { ...m, teamNumber } : m
          ),
        };
      })
    );
    setSaved(false);
  }

  function setGroupTee(groupIndex: number, teeId: string) {
    setGroups((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, teeId } : g))
    );
    setSaved(false);
  }

  async function saveGroups() {
    setSaving(true);
    const res = await fetch(`/api/tournaments/${tournamentId}/groups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  function playerName(id: string) {
    return acceptedPlayers.find((p) => p.id === id)?.name ?? id;
  }

  return (
    <div className="space-y-4">
      {/* Unassigned players pool */}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Unassigned players
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <div key={p.id} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                <span className="text-sm text-gray-700">{p.name}</span>
                <span className="text-xs text-gray-400">HCP {p.handicapIndex}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      {groups.map((group, gi) => (
        <div key={group.groupNumber} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-fairway-900">Group {group.groupNumber}</h3>
            <div className="flex items-center gap-2">
              {tees.length > 1 && (
                <select
                  value={group.teeId}
                  onChange={(e) => setGroupTee(gi, e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-fairway-400"
                >
                  {tees.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              {groups.length > 1 && (
                <button
                  onClick={() => removeGroup(gi)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Member slots */}
          <div className="space-y-2">
            {group.members.map((member) => (
              <div key={member.userId} className="flex items-center gap-2 bg-fairway-50 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-fairway-900">{playerName(member.userId)}</span>

                {/* Team assignment for 2-ball Ambrose */}
                {isAmbrose2(format) && (
                  <div className="flex gap-1">
                    {[1, 2].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTeamNumber(gi, member.userId, t)}
                        className={`text-xs px-2 py-0.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-400 ${
                          member.teamNumber === t
                            ? "bg-fairway-700 text-white border-fairway-700"
                            : "bg-white text-gray-600 border-gray-300 hover:border-fairway-400"
                        }`}
                      >
                        Team {t}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => removeFromGroup(gi, member.userId)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                  aria-label={`Remove ${playerName(member.userId)} from group`}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Add player dropdown */}
            {group.members.length < 4 && unassigned.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    addToGroup(gi, e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full text-sm border border-dashed border-gray-300 rounded-lg px-3 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-fairway-400 bg-white"
              >
                <option value="">+ Add player…</option>
                {unassigned.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (HCP {p.handicapIndex})
                  </option>
                ))}
              </select>
            )}

            {group.members.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-1">No players yet</p>
            )}
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          onClick={addGroup}
          className="flex-1 py-2.5 border border-dashed border-fairway-400 text-fairway-700 rounded-xl text-sm font-medium hover:bg-fairway-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-400"
        >
          + Add group
        </button>
        <button
          onClick={saveGroups}
          disabled={saving || unassigned.length > 0}
          className="flex-1 py-2.5 bg-fairway-700 text-white rounded-xl text-sm font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save groups"}
        </button>
      </div>

      {unassigned.length > 0 && (
        <p className="text-xs text-amber-600 text-center">
          {unassigned.length} player{unassigned.length > 1 ? "s" : ""} must be assigned before saving
        </p>
      )}
    </div>
  );
}
