"use client";

import { parseNineNames, type HolesCount, type StartingHole } from "@/lib/nines";

interface Props {
  holesCount: HolesCount;
  startingHole: StartingHole;
  /** Used to label the nines when the tee name encodes them (e.g. "Red/Blue"). */
  teeName?: string | null;
  onChange: (holesCount: HolesCount, startingHole: StartingHole) => void;
}

export default function HolesPicker({ holesCount, startingHole, teeName, onChange }: Props) {
  const names = teeName ? parseNineNames(teeName) : null;
  const nineOptions: { label: string; value: StartingHole }[] = names
    ? [{ label: names.front, value: 1 }, { label: names.back, value: 10 }]
    : [{ label: "Front 9", value: 1 }, { label: "Back 9", value: 10 }];

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium text-fairway-800">Holes</p>
        <div className="flex gap-2">
          {([9, 18] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n, n === 18 ? 1 : startingHole)}
              className={`flex-1 py-2.5 rounded-xl border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
                holesCount === n
                  ? "border-fairway-600 bg-fairway-50 text-fairway-900"
                  : "border-gray-200 bg-white text-gray-600 hover:border-fairway-300"
              }`}
            >
              {n} holes
            </button>
          ))}
        </div>
      </div>

      {holesCount === 9 && teeName && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-fairway-800">Which 9?</p>
          <div className="flex gap-2">
            {nineOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(9, o.value)}
                className={`flex-1 py-2.5 rounded-xl border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
                  startingHole === o.value
                    ? "border-fairway-600 bg-fairway-50 text-fairway-900"
                    : "border-gray-200 bg-white text-gray-600 hover:border-fairway-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
