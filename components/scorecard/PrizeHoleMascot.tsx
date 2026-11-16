/**
 * Original cartoon mascot for the prize-hole popup: a beach golfer in a two-piece and sun hat.
 * Longest Drive → she swings a driver and the ball sails off; Nearest the Pin → she waves beside
 * the flag as a ball rolls up to the cup. Pure SVG + CSS keyframes (globals.css, "gn-" prefix),
 * which stop under prefers-reduced-motion.
 */

const SKIN = "#f1c27d";
const SKIN_SHADE = "#e0a960";
const HAIR = "#5b3a1e";
const SUIT = "#f0566a";
const HAT = "#f6e3b4";

/** Pivot an SVG group around a point in viewBox units */
const pivot = (x: number, y: number) => ({ transformBox: "view-box" as const, transformOrigin: `${x}px ${y}px` });

function Sparkle({ x, y, delay }: { x: number; y: number; delay: string }) {
  return (
    <path
      className="gn-sparkle"
      style={{ ...pivot(x, y), animationDelay: delay }}
      d={`M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 5} L${x - 1.5} ${y + 1.5} L${x - 5} ${y} L${x - 1.5} ${y - 1.5} Z`}
      fill="#facc15"
    />
  );
}

/** The figure minus her arms (arms differ per scene) */
function Body() {
  return (
    <>
      {/* Ponytail behind the head */}
      <path d="M60 56 C50 62 50 78 56 84 C58 74 60 66 64 60 Z" fill={HAIR} />
      {/* Legs */}
      <rect x="62" y="104" width="9" height="36" rx="4.5" fill={SKIN} />
      <rect x="73" y="104" width="9" height="36" rx="4.5" fill={SKIN} />
      {/* Sandals */}
      <ellipse cx="66" cy="141" rx="6" ry="2.5" fill={HAIR} />
      <ellipse cx="78" cy="141" rx="6" ry="2.5" fill={HAIR} />
      {/* Torso */}
      <rect x="60" y="72" width="24" height="36" rx="10" fill={SKIN} />
      {/* Swimsuit: bandeau top and bottoms */}
      <rect x="60" y="78" width="24" height="9" rx="4" fill={SUIT} />
      <circle cx="66" cy="82" r="1.2" fill="#fff" />
      <circle cx="72" cy="83" r="1.2" fill="#fff" />
      <circle cx="78" cy="82" r="1.2" fill="#fff" />
      <path d="M60 98 H84 V104 C84 110 78 112 72 112 C66 112 60 110 60 104 Z" fill={SUIT} />
      {/* Neck and head */}
      <rect x="68" y="64" width="8" height="10" rx="3" fill={SKIN_SHADE} />
      <circle cx="72" cy="56" r="12" fill={SKIN} />
      {/* Fringe */}
      <path d="M60 54 C62 46 70 43 78 45 C82 47 84 50 84 54 C78 50 68 50 60 54 Z" fill={HAIR} />
      {/* Sun hat */}
      <ellipse cx="72" cy="46" rx="19" ry="4.5" fill={HAT} />
      <path d="M62 46 C62 36 82 36 82 46 Z" fill={HAT} />
      <rect x="62" y="42" width="20" height="3" fill="#2d6b2d" />
      {/* Sunglasses */}
      <rect x="64" y="53" width="7" height="5" rx="2.5" fill="#1f2937" />
      <rect x="73" y="53" width="7" height="5" rx="2.5" fill="#1f2937" />
      <path d="M71 55 H73" stroke="#1f2937" strokeWidth="1.2" />
      {/* Smile and cheeks */}
      <path d="M68 62 Q72 66 76 62" stroke="#9a3412" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="65" cy="61" r="1.6" fill="#f9a8a8" opacity="0.7" />
      <circle cx="79" cy="61" r="1.6" fill="#f9a8a8" opacity="0.7" />
    </>
  );
}

function Backdrop() {
  return (
    <>
      <rect x="0" y="0" width="160" height="160" rx="24" fill="#dff1fb" />
      <circle cx="132" cy="28" r="12" fill="#fde68a" />
      {/* Fairway and a strip of sand */}
      <path d="M0 132 C40 124 120 124 160 132 V136 C160 149 149 160 136 160 H24 C11 160 0 149 0 136 Z" fill="#6db86d" />
      <path d="M0 146 C30 140 70 142 100 150 C110 154 118 158 124 160 H24 C11 160 0 153 0 146 Z" fill="#f0dcc8" />
    </>
  );
}

function LongestDrive() {
  return (
    <>
      {/* Ball trail and the ball sailing away */}
      <path
        className="gn-trail"
        d="M94 138 Q120 60 152 70"
        stroke="#ffffff"
        strokeWidth="2"
        strokeDasharray="3 4"
        fill="none"
      />
      <circle className="gn-ball-flight" cx="94" cy="138" r="3" fill="#fff" stroke="#9ca3af" strokeWidth="0.8" />

      <g className="gn-bob">
        <Body />
        {/* Left arm resting */}
        <rect x="54" y="74" width="7" height="26" rx="3.5" fill={SKIN} transform="rotate(12 57 76)" />
        {/* Right arm with driver, swinging from the shoulder */}
        <g className="gn-swing" style={pivot(83, 76)}>
          <rect x="80" y="74" width="7" height="26" rx="3.5" fill={SKIN} />
          <line x1="83.5" y1="98" x2="94" y2="134" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <rect x="91" y="132" width="9" height="5" rx="2" fill="#374151" />
        </g>
      </g>
    </>
  );
}

function NearestPin() {
  return (
    <>
      {/* Cup, flagstick and waving flag */}
      <ellipse cx="124" cy="139" rx="6" ry="2" fill="#1f2937" />
      <line x1="124" y1="139" x2="124" y2="78" stroke="#e5e7eb" strokeWidth="2" />
      <path className="gn-flag-wave" style={pivot(124, 84)} d="M124 78 L146 84 L124 90 Z" fill={SUIT} />
      {/* Ball rolling up to the cup */}
      <circle className="gn-roll" cx="30" cy="137" r="3" fill="#fff" stroke="#9ca3af" strokeWidth="0.8" />

      <g className="gn-bob">
        <Body />
        {/* Hand on hip */}
        <path d="M60 76 L50 90 L60 98" stroke={SKIN} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Waving arm, raised from the shoulder */}
        <g className="gn-wave" style={pivot(83, 76)}>
          <rect x="80" y="50" width="7" height="28" rx="3.5" fill={SKIN} />
          <circle cx="83.5" cy="50" r="4.5" fill={SKIN} />
        </g>
      </g>
    </>
  );
}

export default function PrizeHoleMascot({
  type,
  className = "",
}: {
  type: "LONGEST_DRIVE" | "NEAREST_PIN";
  className?: string;
}) {
  const label = type === "LONGEST_DRIVE" ? "Longest Drive" : "Nearest to Pin";
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label={`Cartoon golfer cheering for ${label}`} className={className}>
      <Backdrop />
      {type === "LONGEST_DRIVE" ? <LongestDrive /> : <NearestPin />}
      <Sparkle x={24} y={30} delay="0s" />
      <Sparkle x={108} y={22} delay="0.6s" />
      <Sparkle x={40} y={70} delay="1.2s" />
    </svg>
  );
}
