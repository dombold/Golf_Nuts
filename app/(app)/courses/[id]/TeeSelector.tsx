"use client";

import { useState } from "react";

interface Hole {
  id: string;
  number: number;
  par: number;
  strokeIndex: number;
  distance: number | null;
}

interface Tee {
  id: string;
  name: string;
  rating: number;
  slope: number;
  par: number;
  holes: Hole[];
}

export default function TeeSelector({ tees }: { tees: Tee[] }) {
  const [selectedTeeId, setSelectedTeeId] = useState<string | null>(null);

  const selectedTee = tees.find((t) => t.id === selectedTeeId) ?? null;

  function handleSelect(id: string) {
    setSelectedTeeId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {tees.map((tee) => {
          const isSelected = tee.id === selectedTeeId;
          return (
            <button
              key={tee.id}
              onClick={() => handleSelect(tee.id)}
              className={`w-full text-left rounded-xl border px-4 py-3 flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
                isSelected
                  ? "bg-fairway-900 border-fairway-900 text-white"
                  : "bg-white border-fairway-100 text-fairway-900 hover:bg-fairway-50"
              }`}
            >
              <span className="font-semibold">{tee.name} Tees</span>
              <span className={`text-sm ${isSelected ? "text-fairway-300" : "text-gray-400"}`}>
                CR {tee.rating} / Slope {tee.slope} / Par {tee.par}
              </span>
            </button>
          );
        })}
      </div>

      {selectedTee && selectedTee.holes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-fairway-50 overflow-hidden">
          <div className="bg-fairway-900 text-white px-4 py-2.5">
            <span className="font-semibold text-sm">{selectedTee.name} Tees — Hole Details</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-fairway-50 text-fairway-700">
                  <th className="px-3 py-2 text-left">Hole</th>
                  <th className="px-3 py-2 text-center">Par</th>
                  <th className="px-3 py-2 text-center">SI</th>
                  <th className="px-3 py-2 text-center">Meters</th>
                </tr>
              </thead>
              <tbody>
                {selectedTee.holes.map((hole, i) => (
                  <tr key={hole.id} className={i % 2 === 0 ? "" : "bg-fairway-50/50"}>
                    <td className="px-3 py-1.5 font-medium text-fairway-800">{hole.number}</td>
                    <td className="px-3 py-1.5 text-center">{hole.par}</td>
                    <td className="px-3 py-1.5 text-center text-gray-500">{hole.strokeIndex}</td>
                    <td className="px-3 py-1.5 text-center text-gray-500">{hole.distance ?? "—"}</td>
                  </tr>
                ))}
                <tr className="bg-fairway-100 font-semibold text-fairway-900">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-center">{selectedTee.par}</td>
                  <td className="px-3 py-2 text-center">—</td>
                  <td className="px-3 py-2 text-center">
                    {selectedTee.holes.reduce((s, h) => s + (h.distance ?? 0), 0) || "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
