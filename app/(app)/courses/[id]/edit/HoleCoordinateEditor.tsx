"use client";

import { useState } from "react";

interface Hole {
  id: string;
  number: number;
  par: number;
  strokeIndex: number;
  teeLat: number | null;
  teeLng: number | null;
  greenLat: number | null;
  greenLng: number | null;
}

interface Tee {
  id: string;
  name: string;
  holes: Hole[];
}

type RowState = {
  teeLat: string;
  teeLng: string;
  greenLat: string;
  greenLng: string;
  saving: boolean;
  saved: boolean;
};

function toStr(v: number | null) {
  return v != null ? String(v) : "";
}

function toFloat(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export default function HoleCoordinateEditor({ tees }: { tees: Tee[] }) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    for (const tee of tees) {
      for (const hole of tee.holes) {
        init[hole.id] = {
          teeLat:   toStr(hole.teeLat),
          teeLng:   toStr(hole.teeLng),
          greenLat: toStr(hole.greenLat),
          greenLng: toStr(hole.greenLng),
          saving: false,
          saved: false,
        };
      }
    }
    return init;
  });

  function update(holeId: string, field: keyof Omit<RowState, "saving" | "saved">, value: string) {
    setRows((prev) => ({ ...prev, [holeId]: { ...prev[holeId], [field]: value, saved: false } }));
  }

  async function saveHole(holeId: string) {
    const row = rows[holeId];
    setRows((prev) => ({ ...prev, [holeId]: { ...prev[holeId], saving: true, saved: false } }));
    const res = await fetch(`/api/holes/${holeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teeLat:   toFloat(row.teeLat),
        teeLng:   toFloat(row.teeLng),
        greenLat: toFloat(row.greenLat),
        greenLng: toFloat(row.greenLng),
      }),
    });
    setRows((prev) => ({ ...prev, [holeId]: { ...prev[holeId], saving: false, saved: res.ok } }));
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        Coordinates use decimal degrees (e.g. <span className="font-mono">-33.8688</span>,&nbsp;
        <span className="font-mono">151.2093</span>). You can find them by right-clicking a location in Google Maps.
      </div>

      {tees.map((tee) => (
        <div key={tee.id} className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
          <div className="bg-fairway-900 text-white px-4 py-3">
            <span className="font-semibold">{tee.name} Tees</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-fairway-50 text-fairway-700">
                  <th className="px-3 py-2 text-left">Hole</th>
                  <th className="px-3 py-2 text-center">Par</th>
                  <th className="px-3 py-2 text-center">Tee Lat</th>
                  <th className="px-3 py-2 text-center">Tee Lng</th>
                  <th className="px-3 py-2 text-center">Green Lat</th>
                  <th className="px-3 py-2 text-center">Green Lng</th>
                  <th className="px-3 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {tee.holes.map((hole, i) => {
                  const row = rows[hole.id];
                  return (
                    <tr key={hole.id} className={i % 2 === 0 ? "" : "bg-fairway-50/50"}>
                      <td className="px-3 py-1.5 font-medium text-fairway-800">{hole.number}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{hole.par}</td>
                      {(["teeLat", "teeLng", "greenLat", "greenLng"] as const).map((field) => (
                        <td key={field} className="px-2 py-1">
                          <input
                            type="number"
                            step="0.000001"
                            placeholder="—"
                            value={row[field]}
                            onChange={(e) => update(hole.id, field, e.target.value)}
                            className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-fairway-400 focus:border-transparent"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => saveHole(hole.id)}
                          disabled={row.saving}
                          className="px-3 py-1 rounded-lg bg-fairway-700 text-white text-xs font-medium hover:bg-fairway-800 disabled:opacity-50 transition-colors"
                        >
                          {row.saving ? "Saving…" : row.saved ? "Saved ✓" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
