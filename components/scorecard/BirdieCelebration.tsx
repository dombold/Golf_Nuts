import type { CSSProperties } from "react";
import { ACHIEVEMENT_LABEL, type Celebration } from "@/lib/celebrations";

/**
 * Fireworks popup for a birdie or better (raw score). The bursts are CSS particles ("gn-" keyframes
 * in globals.css), drawn once and looped; under prefers-reduced-motion only the card shows.
 */

const COLOURS = ["#facc15", "#f0566a", "#6db86d", "#60a5fa", "#f0dcc8", "#c084fc"];
const PARTICLES = 18;

// Fixed burst positions/timings (no randomness during render), above and below the card
const BURSTS = [
  { left: "22%", top: "13%", delay: 0, colour: 0, size: 85 },
  { left: "78%", top: "10%", delay: 0.35, colour: 1, size: 100 },
  { left: "50%", top: "20%", delay: 0.7, colour: 3, size: 70 },
  { left: "25%", top: "86%", delay: 1.0, colour: 2, size: 80 },
  { left: "75%", top: "88%", delay: 1.3, colour: 5, size: 95 },
];

function Burst({ left, top, delay, colour, size }: (typeof BURSTS)[number]) {
  return (
    <div className="absolute" style={{ left, top }}>
      {Array.from({ length: PARTICLES }, (_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2;
        const style = {
          "--dx": `${Math.round(Math.cos(angle) * size)}px`,
          "--dy": `${Math.round(Math.sin(angle) * size)}px`,
          background: COLOURS[(colour + (i % 2)) % COLOURS.length],
          animationDelay: `${delay}s`,
        } as CSSProperties;
        return <span key={i} className="gn-burst absolute block w-2.5 h-2.5 -ml-1 -mt-1 rounded-full shadow-[0_0_6px_currentColor]" style={style} />;
      })}
    </div>
  );
}

function describe(c: Celebration, par: number) {
  return `${c.strokes} on a par ${par}`;
}

export default function BirdieCelebration({
  holeNumber,
  par,
  celebrations,
  onClose,
}: {
  holeNumber: number;
  par: number;
  celebrations: Celebration[];
  onClose: () => void;
}) {
  const best = celebrations[0];
  if (!best) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="birdie-title"
    >
      <div className="absolute inset-0 bg-fairway-950/70" onClick={onClose} />
      <div className="gn-fireworks pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {BURSTS.map((b, i) => <Burst key={i} {...b} />)}
      </div>
      <div className="gn-pop relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
        <div className="text-5xl" aria-hidden="true">🎆</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fairway-500 mb-1">Hole {holeNumber}</p>
          <h2 id="birdie-title" className="text-2xl font-bold text-fairway-900">
            {ACHIEVEMENT_LABEL[best.achievement]}
          </h2>
        </div>
        <ul className="space-y-1.5">
          {celebrations.map((c) => (
            <li key={c.who} className="rounded-lg bg-fairway-50 px-3 py-2 text-sm">
              <span className="font-semibold text-fairway-900 break-words">{c.who}</span>
              <span className="block text-xs text-gray-500">
                {ACHIEVEMENT_LABEL[c.achievement].replace("!", "")} · {describe(c, par)}
              </span>
            </li>
          ))}
        </ul>
        <button
          autoFocus
          onClick={onClose}
          className="w-full py-3 bg-fairway-700 text-white rounded-xl font-semibold hover:bg-fairway-800 active:bg-fairway-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          Nice one!
        </button>
      </div>
    </div>
  );
}
