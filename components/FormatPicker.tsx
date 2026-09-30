"use client";

import type { ReactNode } from "react";
import { AMBROSE_VARIANTS, STABLEFORD_TEAM_SIZES, isAmbroseFormat } from "@/lib/gameFormats";
import SkinsCarryOverToggle from "@/components/SkinsCarryOverToggle";

interface FormatOption {
  value: string;
  label: string;
  desc: string;
}

const cardClass = (selected: boolean) =>
  `w-full text-left px-4 py-3 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
    selected ? "border-fairway-600 bg-fairway-50" : "border-gray-200 bg-white hover:border-fairway-300"
  }`;

/** A format card whose extra options appear inside it once it's selected (Ambrose, Stableford, Skins). */
function ExpandingCard({
  title,
  desc,
  selected,
  onSelect,
  children,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
  /** Shown under the header while the card is selected */
  children: ReactNode;
}) {
  return (
    <div className={cardClass(selected)}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => { if (!selected) onSelect(); }}
        className="w-full text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
      >
        <p className="font-medium text-fairway-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </button>
      {selected && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Radio-style sub-choice buttons (2-ball / 4-ball, Individual / 2-ball / 4-ball). */
function OptionGroup<V extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: V; label: string; desc: string }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-2 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {options.map((o) => {
        const checked = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 ${
              checked
                ? "border-fairway-600 bg-fairway-700 text-white"
                : "border-gray-200 bg-white text-fairway-900 hover:border-fairway-300"
            }`}
          >
            <span className="block text-sm font-semibold">{o.label}</span>
            <span className={`block text-xs ${checked ? "text-fairway-100" : "text-gray-500"}`}>{o.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Game format list. Some formats show extra options inside their card once picked:
 * - Ambrose: one card for 2- and 4-player, with a 2-ball / 4-ball choice.
 * - Stableford: Individual / 2-ball / 4-ball (when the caller supports it).
 * - Skins: the "Carry over halved holes" checkbox (when the caller supports it).
 */
export default function FormatPicker({
  formats,
  value,
  onChange,
  stablefordTeamSize = 1,
  onStablefordTeamSizeChange,
  skinsCarryOver = true,
  onSkinsCarryOverChange,
}: {
  formats: readonly FormatOption[];
  value: string;
  onChange: (format: string) => void;
  stablefordTeamSize?: number;
  onStablefordTeamSizeChange?: (size: 1 | 2 | 4) => void;
  skinsCarryOver?: boolean;
  onSkinsCarryOverChange?: (carryOver: boolean) => void;
}) {
  // Keep the list order: the Ambrose card sits where the first Ambrose format was
  const firstAmbroseIndex = formats.findIndex((f) => isAmbroseFormat(f.value));

  return (
    <div className="space-y-2">
      {formats.map((f, i) => {
        if (isAmbroseFormat(f.value)) {
          if (i !== firstAmbroseIndex) return null;
          return (
            <ExpandingCard
              key="AMBROSE"
              title="Ambrose"
              desc="Best ball scramble — choose 2-ball or 4-ball"
              selected={isAmbroseFormat(value)}
              onSelect={() => onChange(AMBROSE_VARIANTS[0].value)}
            >
              <OptionGroup label="Ambrose teams" options={AMBROSE_VARIANTS} value={value} onChange={onChange} />
            </ExpandingCard>
          );
        }

        if (f.value === "STABLEFORD" && onStablefordTeamSizeChange) {
          return (
            <ExpandingCard
              key={f.value}
              title={f.label}
              desc="Points per hole — individual, 2-ball or 4-ball scramble"
              selected={value === "STABLEFORD"}
              onSelect={() => onChange("STABLEFORD")}
            >
              <OptionGroup
                label="Stableford teams"
                options={STABLEFORD_TEAM_SIZES}
                value={stablefordTeamSize as 1 | 2 | 4}
                onChange={onStablefordTeamSizeChange}
              />
            </ExpandingCard>
          );
        }

        if (f.value === "SKINS" && onSkinsCarryOverChange) {
          return (
            <ExpandingCard
              key={f.value}
              title={f.label}
              desc={f.desc}
              selected={value === "SKINS"}
              onSelect={() => onChange("SKINS")}
            >
              <SkinsCarryOverToggle checked={skinsCarryOver} onChange={onSkinsCarryOverChange} />
            </ExpandingCard>
          );
        }

        const selected = value === f.value;
        return (
          <button key={f.value} type="button" aria-pressed={selected} onClick={() => onChange(f.value)} className={cardClass(selected)}>
            <p className="font-medium text-fairway-900">{f.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
