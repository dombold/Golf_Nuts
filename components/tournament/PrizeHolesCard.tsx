"use client";

import { useState, useEffect } from "react";

interface PrizeHole { holeNumber: number; type: "LONGEST_DRIVE" | "NEAREST_PIN" }
interface TeeHole { id: string; number: number; par: number; strokeIndex: number }

interface Props {
  tournamentId: string;
  teeId: string | null;
  prizeHoles: PrizeHole[];
  canEdit: boolean;
}

export default function PrizeHolesCard({ tournamentId, teeId, prizeHoles: initialPrizeHoles, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [prizeHoles, setPrizeHoles] = useState<PrizeHole[]>(initialPrizeHoles);
  const [selected, setSelected] = useState<PrizeHole[]>(initialPrizeHoles);
  const [teeHoles, setTeeHoles] = useState<TeeHole[]>([]);
  const [holesLoading, setHolesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing || !teeId || teeHoles.length > 0) return;
    setHolesLoading(true);
    fetch(`/api/tees/${teeId}/holes`)
      .then((r) => r.json())
      .then((d) => setTeeHoles(d.holes ?? []))
      .catch(() => setTeeHoles([]))
      .finally(() => setHolesLoading(false));
  }, [editing, teeId, teeHoles.length]);

  function togglePrizeHole(holeNumber: number, type: "LONGEST_DRIVE" | "NEAREST_PIN") {
    const isFront = holeNumber <= 9;
    setSelected((prev) => {
      if (prev.find((p) => p.holeNumber === holeNumber)) {
        return prev.filter((p) => p.holeNumber !== holeNumber);
      }
      const sameTypeAndNine = prev.filter((p) => p.type === type && (p.holeNumber <= 9) === isFront);
      if (type === "NEAREST_PIN") {
        if (sameTypeAndNine.length >= 2) return prev;
        return [...prev, { holeNumber, type }];
      }
      return [
        ...prev.filter((p) => !(p.type === type && (p.holeNumber <= 9) === isFront)),
        { holeNumber, type },
      ];
    });
  }

  function handleCancel() {
    setSelected(prizeHoles);
    setEditing(false);
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/prize-holes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeHoles: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? data.error ?? "Failed to save prize holes");
      } else {
        setPrizeHoles(data.prizeHoles);
        setSelected(data.prizeHoles);
        setEditing(false);
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const longest = prizeHoles.filter((p) => p.type === "LONGEST_DRIVE").sort((a, b) => a.holeNumber - b.holeNumber);
  const nearest = prizeHoles.filter((p) => p.type === "NEAREST_PIN").sort((a, b) => a.holeNumber - b.holeNumber);

  if (!editing) {
    // View mode
    const hasHoles = prizeHoles.length > 0;
    if (!hasHoles && !canEdit) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h2 className="font-semibold text-fairway-900">Prize Holes</h2>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm bg-fairway-700 text-white px-3 py-1 rounded-lg hover:bg-fairway-800 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
            >
              {hasHoles ? "Edit" : "Add"}
            </button>
          )}
        </div>

        {!hasHoles ? (
          <p className="px-4 py-3 text-gray-400 text-sm">No prize holes configured.</p>
        ) : (
          <dl className="divide-y divide-gray-50">
            {longest.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="flex items-center gap-1.5 text-gray-500">
                  <span>🏌️</span> Longest Drive
                </dt>
                <dd className="font-medium text-gray-800">
                  {longest.map((p) => `Hole ${p.holeNumber}`).join(" · ")}
                </dd>
              </div>
            )}
            {nearest.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="flex items-center gap-1.5 text-gray-500">
                  <span>🎯</span> Nearest to Pin
                </dt>
                <dd className="font-medium text-gray-800">
                  {nearest.map((p) => `Hole ${p.holeNumber}`).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
    );
  }

  // Edit mode
  const frontNine = teeHoles.filter((h) => h.number <= 9);
  const backNine  = teeHoles.filter((h) => h.number >= 10);
  const par5s = (nine: TeeHole[]) => nine.filter((h) => h.par === 5);
  const par3s = (nine: TeeHole[]) => nine.filter((h) => h.par === 3);

  function renderGroup(holes: TeeHole[], type: "LONGEST_DRIVE" | "NEAREST_PIN", label: string) {
    if (holes.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="flex flex-wrap gap-2">
          {holes.map((h) => {
            const active = selected.some((p) => p.holeNumber === h.number);
            return (
              <button
                key={h.number}
                onClick={() => togglePrizeHole(h.number, type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
                  active
                    ? "bg-fairway-600 text-white border-fairway-600"
                    : "bg-white text-fairway-800 border-gray-200 hover:border-fairway-400"
                }`}
              >
                Hole {h.number}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const hasFront = par5s(frontNine).length > 0 || par3s(frontNine).length > 0;
  const hasBack  = par5s(backNine).length  > 0 || par3s(backNine).length  > 0;
  const noEligible = !holesLoading && teeHoles.length > 0 && !hasFront && !hasBack;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-sm">
      <div className="px-4 py-3 border-b border-gray-50">
        <h2 className="font-semibold text-fairway-900">Prize Holes</h2>
        <p className="text-xs text-gray-500 mt-0.5">One Longest Drive and up to two Nearest to Pin holes per nine.</p>
      </div>

      <div className="px-4 py-4 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs">{error}</div>
        )}

        {holesLoading && (
          <p className="text-gray-400 text-center py-4">Loading holes…</p>
        )}

        {noEligible && (
          <p className="text-gray-400 text-center py-4">No Par 3 or Par 5 holes found for this tee.</p>
        )}

        {!holesLoading && hasFront && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-fairway-800 border-b border-fairway-100 pb-1">Front Nine</p>
            {renderGroup(par5s(frontNine), "LONGEST_DRIVE", "Longest Drive (Par 5)")}
            {renderGroup(par3s(frontNine), "NEAREST_PIN",   "Nearest to Pin (Par 3)")}
          </div>
        )}

        {!holesLoading && hasBack && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-fairway-800 border-b border-fairway-100 pb-1">Back Nine</p>
            {renderGroup(par5s(backNine), "LONGEST_DRIVE", "Longest Drive (Par 5)")}
            {renderGroup(par3s(backNine), "NEAREST_PIN",   "Nearest to Pin (Par 3)")}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
