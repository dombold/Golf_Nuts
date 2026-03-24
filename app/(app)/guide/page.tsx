import Link from "next/link";

const sections = [
  { id: "dashboard", icon: "🏠", title: "Dashboard" },
  { id: "play", icon: "⛳", title: "Playing a Round" },
  { id: "scoring", icon: "📋", title: "Live Scoring" },
  { id: "courses", icon: "🗺️", title: "Courses" },
  { id: "stats", icon: "📊", title: "Stats & Handicap" },
  { id: "tournaments", icon: "🏆", title: "Events & Tournaments" },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-fairway-900">User Guide</h1>
        <p className="text-sm text-gray-500 mt-1">
          Everything you need to know to get the most out of Golf Nuts.
        </p>
      </div>

      {/* Quick-jump index */}
      <nav className="bg-white rounded-xl border border-fairway-50 p-4">
        <p className="text-sm font-semibold text-fairway-800 mb-2">On this page</p>
        <ul className="space-y-1">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-sm text-fairway-700 hover:text-fairway-900 hover:underline"
              >
                {s.icon} {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Dashboard */}
      <div id="dashboard" className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20">
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>🏠</span> Dashboard
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            The Dashboard is your home screen. It shows your current{" "}
            <span className="font-semibold text-fairway-900">Handicap Index</span> at the top, four
            quick-action tiles (New Round, Find Course, My Stats, Tournaments), and your five most
            recent completed rounds.
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              Your Handicap Index updates automatically after every completed round — no manual input
              needed.
            </li>
            <li>
              Tap <span className="font-semibold">+ New Round</span> to start the three-step round
              wizard.
            </li>
            <li>
              Tap any recent round in the list to view its full scorecard and result summary.
            </li>
          </ul>

          <div className="mt-4 pt-4 border-t border-fairway-50">
            <p className="font-semibold text-fairway-900 mb-2">📲 Add Golf Nuts to your home screen</p>
            <p className="mb-3">
              Golf Nuts works like a native app when installed on your phone — full screen, no browser
              bar, and quick to launch from your home screen.
            </p>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-fairway-800 mb-1">Android (Chrome)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Open Golf Nuts in Chrome.</li>
                  <li>Tap the <span className="font-semibold">⋮</span> menu in the top-right corner.</li>
                  <li>Tap <span className="font-semibold">Add to Home screen</span>.</li>
                  <li>Tap <span className="font-semibold">Add</span> to confirm.</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-fairway-800 mb-1">iPhone / iPad (Safari)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Open Golf Nuts in Safari.</li>
                  <li>Tap the <span className="font-semibold">Share</span> button (the box with an arrow pointing up) at the bottom of the screen.</li>
                  <li>Scroll down and tap <span className="font-semibold">Add to Home Screen</span>.</li>
                  <li>Tap <span className="font-semibold">Add</span> in the top-right corner.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playing a Round */}
      <div id="play" className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20">
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>⛳</span> Playing a Round
        </h2>
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Starting a round takes three steps. Tap <span className="font-semibold">Play</span> in
            the navigation to begin.
          </p>

          <div>
            <p className="font-semibold text-fairway-700 mb-1">Step 1 — Select course and tees</p>
            <p>
              Choose from your saved courses. Tap a course to expand its tee sets — each tee shows
              the Course Rating, Slope, and Par. Select the tee you are playing from, then tap{" "}
              <span className="font-semibold">Next</span>. If no courses appear,{" "}
              <Link href="/courses" className="text-fairway-700 underline">
                import one first
              </Link>
              .
            </p>
          </div>

          <div>
            <p className="font-semibold text-fairway-700 mb-2">Step 2 — Choose a format</p>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-fairway-900">Strokeplay</span> — lowest total
                gross strokes wins. Net scores (adjusted for handicap) are used for handicap
                calculations.
              </li>
              <li>
                <span className="font-semibold text-fairway-900">Stableford</span> — you earn points
                per hole: 3 for birdie, 2 for par, 1 for bogey, 0 for double-bogey or worse. Your
                handicap strokes are applied per hole so all skill levels compete fairly.
              </li>
              <li>
                <span className="font-semibold text-fairway-900">Match Play</span> — hole-by-hole
                competition. Win a hole, lose a hole, or halve it. Net strokes per hole determine
                each result.
              </li>
              <li>
                <span className="font-semibold text-fairway-900">Skins</span> — each hole is worth
                one skin. Win a hole outright (no ties) to claim it. Tied holes carry the skin
                forward to the next hole.
              </li>
              <li>
                <span className="font-semibold text-fairway-900">2-Player Ambrose</span> — each
                pair picks the best drive then all play from that spot. A team scramble format for
                pairs.
              </li>
              <li>
                <span className="font-semibold text-fairway-900">4-Player Ambrose</span> — same as
                2-Player but for a team of four.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-fairway-700 mb-1">Step 3 — Select players</p>
            <p>
              You are always included. Tap any other registered user to add them to the round, then tap{" "}
              <span className="font-semibold">Tee Off!</span> to begin.
            </p>
          </div>
        </div>
      </div>

      {/* Live Scoring */}
      <div id="scoring" className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20">
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>📋</span> Live Scoring
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            <span className="font-semibold text-fairway-900">Navigating holes</span> — The row of
            numbered dots at the top represents holes 1–18. Tap any dot to jump to that hole. The
            current hole is highlighted in green; completed holes are filled in.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Entering a score</span> — Use the{" "}
            <span className="font-semibold">−</span> and <span className="font-semibold">+</span>{" "}
            buttons to set each player&apos;s gross strokes. The score badge on each player card
            updates instantly — dark green for eagle or better, medium green for birdie, no colour
            for par, amber for bogey, red for double-bogey or worse.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Stat tracking (optional)</span> —
            Below the stroke counter you can record:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <span className="font-semibold">Putts</span> — tap the number to set how many putts
              you took on the green.
            </li>
            <li>
              <span className="font-semibold">Fairway Hit (FIR)</span> — shown on par 4s and par
              5s only. Tap to toggle whether you hit the fairway off the tee.
            </li>
            <li>
              <span className="font-semibold">Green in Regulation (GIR)</span> — did you reach the
              green in the required number of strokes? Tap to toggle.
            </li>
          </ul>
          <p>
            These three stats feed directly into your averages on the{" "}
            <Link href="/stats" className="text-fairway-700 underline">
              Stats page
            </Link>
            .
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Saving and moving on</span> — Tap{" "}
            <span className="font-semibold">Save &amp; Next Hole</span>. Scores are saved to the
            server immediately. You can go back to any previous hole at any time and edit scores
            before the round is finished.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Leaderboard tab</span> — Tap{" "}
            <span className="font-semibold">Leaderboard</span> at the top of the scorecard to see a
            live running total for all players. Stableford shows cumulative points; all other
            formats show net score relative to par.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Finishing the round</span> — On the
            final hole, tap <span className="font-semibold">Finish Round</span> instead of Save
            &amp; Next. You will be taken to the round summary and your Handicap Index will be
            recalculated automatically.
          </p>
        </div>
      </div>

      {/* Courses */}
      <div id="courses" className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20">
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>🗺️</span> Courses
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            The{" "}
            <Link href="/courses" className="text-fairway-700 underline">
              Courses page
            </Link>{" "}
            lists every course your group has imported, sorted alphabetically. Tap a course to view
            all its tee sets (with Course Rating, Slope, and Par) and a full hole-by-hole breakdown
            of distances and pars.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Importing a course</span> — Tap{" "}
            <span className="font-semibold">+ Add Course</span> in the top-right corner. Type the
            course name in the search box — Golf Nuts searches an external course database. Tap a
            result to preview it, then tap <span className="font-semibold">Import</span> to save it
            permanently. Once imported, it is available to everyone in your group.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Starting a round from a course</span>{" "}
            — On the course detail page, tap{" "}
            <span className="font-semibold">Play this Course</span> to jump straight into the round
            wizard with that course pre-selected.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div id="stats" className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20">
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>📊</span> Stats &amp; Handicap
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            <span className="font-semibold text-fairway-900">Handicap Index</span> — Shown at the
            top of the{" "}
            <Link href="/stats" className="text-fairway-700 underline">
              Stats page
            </Link>
            . Calculated from your best 8 of your last 20 scores using the World Handicap System
            formula. It updates automatically after every completed round.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Handicap Trend chart</span> — Shows
            your Handicap Index over time. A falling line means you are improving. The chart only
            appears after two or more completed rounds.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Summary tiles</span> — Three tiles
            show your averages across recent rounds:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <span className="font-semibold">Avg Score</span> — your mean gross score per round.
            </li>
            <li>
              <span className="font-semibold">Fairways (FIR%)</span> — percentage of par-4 and
              par-5 tee shots that found the fairway.
            </li>
            <li>
              <span className="font-semibold">GIR%</span> — percentage of greens reached in
              regulation.
            </li>
          </ul>
          <p>
            <span className="font-semibold text-fairway-900">Recent Rounds table</span> — Lists up
            to 20 rounds with date, course, gross score (and to-par), FIR%, GIR%, and average putts
            per hole. Scroll horizontally on mobile to see all columns.
          </p>
        </div>
      </div>

      {/* Tournaments */}
      <div
        id="tournaments"
        className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20"
      >
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>🏆</span> Events &amp; Tournaments
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            A tournament groups multiple rounds under a single competition — useful for club events,
            weekends away, or a multi-round match-play bracket.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Creating an event</span> — Tap{" "}
            <span className="font-semibold">+ New Event</span> on the{" "}
            <Link href="/tournaments" className="text-fairway-700 underline">
              Events page
            </Link>
            . Give it a name and save. The tournament starts with a{" "}
            <span className="font-semibold">Pending</span> status badge.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Adding rounds to a tournament</span>{" "}
            — When creating a new round via the Play tab, you will have the option to attach it to
            an active tournament. Each round you add increments the round count shown on the
            tournament card.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Status badges</span>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <span className="font-semibold">Pending</span> — tournament created but no rounds
              started yet.
            </li>
            <li>
              <span className="font-semibold">Active</span> — at least one round is underway.
            </li>
            <li>
              <span className="font-semibold">Complete</span> — all rounds have been finished.
            </li>
          </ul>
          <p>
            Tap any round inside a tournament card to view its scorecard or resume scoring if it is
            still in progress.
          </p>
        </div>
      </div>
    </div>
  );
}
