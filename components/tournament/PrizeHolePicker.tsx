"use client";

import { useId } from "react";
import { MAX_PER_NINE, togglePrizeHole, type PrizeHoleInput, type PrizeType } from "@/lib/prizeHoles";

interface TeeHole { number: number; par: number }

const holeButton = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
    active
      ? "bg-fairway-600 text-white border-fairway-600"
      : "bg-white text-fairway-800 border-gray-200 hover:border-fairway-400"
  }`;

/**
 * Choose an event's prize holes, nine by nine: Longest Drive on par 5s (buttons) or any par 4
 * (dropdown), Nearest the Pin on par 3s — up to two of each per nine. `holes` are the holes in play.
 */
export default function PrizeHolePicker({
  holes,
  selected,
  onChange,
}: {
  holes: TeeHole[];
  selected: PrizeHoleInput[];
  onChange: (next: PrizeHoleInput[]) => void;
}) {
  const toggle = (holeNumber: number, type: PrizeType) => onChange(togglePrizeHole(selected, holeNumber, type));

  const nines = [
    { label: "Front Nine", holes: holes.filter((h) => h.number <= 9) },
    { label: "Back Nine", holes: holes.filter((h) => h.number >= 10) },
  ].filter((n) => n.holes.some((h) => h.par >= 3 && h.par <= 5));

  if (nines.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No Par 3, 4 or 5 holes found for this tee.</p>;
  }

  return (
    <div className="space-y-5">
      {nines.map((nine) => (
        <Nine key={nine.label} label={nine.label} holes={nine.holes} selected={selected} toggle={toggle} />
      ))}
    </div>
  );
}

function Nine({
  label,
  holes,
  selected,
  toggle,
}: {
  label: string;
  holes: TeeHole[];
  selected: PrizeHoleInput[];
  toggle: (holeNumber: number, type: PrizeType) => void;
}) {
  const selectId = useId();
  const isSelected = (n: number, type: PrizeType) => selected.some((p) => p.holeNumber === n && p.type === type);

  const par5s = holes.filter((h) => h.par === 5);
  const par4s = holes.filter((h) => h.par === 4);
  const par3s = holes.filter((h) => h.par === 3);
  // Par 4 Longest Drives show as buttons beside the par 5s, so they can be removed the same way
  const chosenPar4s = par4s.filter((h) => isSelected(h.number, "LONGEST_DRIVE"));
  const availablePar4s = par4s.filter((h) => !selected.some((p) => p.holeNumber === h.number));
  const drivesChosen = selected.filter((p) => p.type === "LONGEST_DRIVE" && holes.some((h) => h.number === p.holeNumber)).length;
  const drivesFull = drivesChosen >= MAX_PER_NINE.LONGEST_DRIVE;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-fairway-800 border-b border-fairway-100 pb-1">{label}</p>

      {(par5s.length > 0 || par4s.length > 0) && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Longest Drive — up to {MAX_PER_NINE.LONGEST_DRIVE}
          </p>
          {(par5s.length > 0 || chosenPar4s.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {[...par5s, ...chosenPar4s].map((h) => {
                const active = isSelected(h.number, "LONGEST_DRIVE");
                return (
                  <button
                    key={h.number}
                    type="button"
                    onClick={() => toggle(h.number, "LONGEST_DRIVE")}
                    aria-pressed={active}
                    className={holeButton(active)}
                  >
                    Hole {h.number}
                    {h.par === 4 && <span className="font-normal opacity-80"> · par 4</span>}
                  </button>
                );
              })}
            </div>
          )}
          {availablePar4s.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={selectId} className="sr-only">
                Add a par 4 as a Longest Drive hole on the {label.toLowerCase()}
              </label>
              <select
                id={selectId}
                value=""
                disabled={drivesFull}
                onChange={(e) => {
                  if (e.target.value) toggle(Number(e.target.value), "LONGEST_DRIVE");
                }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-fairway-800 hover:border-fairway-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 disabled:opacity-50 disabled:hover:border-gray-200"
              >
                <option value="">Add a par 4…</option>
                {availablePar4s.map((h) => (
                  <option key={h.number} value={h.number}>
                    Hole {h.number} (par 4)
                  </option>
                ))}
              </select>
              {drivesFull && <span className="text-xs text-gray-500">{MAX_PER_NINE.LONGEST_DRIVE} chosen — remove one to change</span>}
            </div>
          )}
        </div>
      )}

      {par3s.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Nearest to Pin (Par 3) — up to {MAX_PER_NINE.NEAREST_PIN}
          </p>
          <div className="flex flex-wrap gap-2">
            {par3s.map((h) => {
              const active = isSelected(h.number, "NEAREST_PIN");
              return (
                <button
                  key={h.number}
                  type="button"
                  onClick={() => toggle(h.number, "NEAREST_PIN")}
                  aria-pressed={active}
                  className={holeButton(active)}
                >
                  Hole {h.number}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
