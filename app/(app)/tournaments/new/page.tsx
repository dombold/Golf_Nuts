"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FORMATS = [
  { value: "STROKEPLAY", label: "Strokeplay" },
  { value: "STABLEFORD", label: "Stableford" },
  { value: "MATCH_PLAY", label: "Match Play" },
  { value: "SKINS", label: "Skins" },
  { value: "AMBROSE_2", label: "2-Player Ambrose" },
  { value: "AMBROSE_4", label: "4-Player Ambrose" },
];

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("STABLEFORD");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, format }),
    });
    const data = await res.json();
    if (data.tournament) {
      router.push("/tournaments");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-2xl font-bold text-fairway-900">New Event</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Club Championship 2026"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
          <div className="space-y-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  format === f.value
                    ? "border-fairway-600 bg-fairway-50 text-fairway-900 font-medium"
                    : "border-gray-200 bg-white text-gray-700 hover:border-fairway-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40"
        >
          {loading ? "Creating…" : "Create Event"}
        </button>
      </form>
    </div>
  );
}
