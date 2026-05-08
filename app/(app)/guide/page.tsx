import Link from "next/link";

const sections = [
  { id: "dashboard", icon: "🏠", title: "Dashboard" },
  { id: "play", icon: "⛳", title: "Playing a Round" },
  { id: "scoring", icon: "📋", title: "Live Scoring" },
  { id: "courses", icon: "🗺️", title: "Courses & Tees" },
  { id: "stats", icon: "📊", title: "Stats & Handicap" },
  { id: "tournaments", icon: "🏆", title: "Events & Tournaments" },
  { id: "notifications", icon: "🔔", title: "Notifications" },
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
            <span className="font-semibold text-fairway-900">Handicap Index</span> at the top, three
            quick-action tiles (New Round, My Stats, Tournaments), and your five most recent
            completed rounds.
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              Your Handicap Index updates automatically after every completed Strokeplay round — no manual input
              needed.
            </li>
            <li>
              If you have a pending tournament invitation, a button appears in the banner to take you
              straight to it. If you have accepted an upcoming event, the banner shows a shortcut to
              that event instead.
            </li>
            <li>
              Tap <span className="font-semibold">New Round</span> or{" "}
              <span className="font-semibold">Play</span> in the navigation to start the round wizard.
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
            <p className="font-semibold text-fairway-700 mb-1">Step 1 — Select course and tee</p>
            <p>
              Type at least two characters in the search box to find your course — all WA courses
              are pre-loaded. Tap the course to select it, then choose the tee you are playing from
              — each tee shows the Course Rating, total length in metres, and Par. Tees are listed
              longest first. Select <span className="font-semibold">9 holes</span> or{" "}
              <span className="font-semibold">18 holes</span>, then tap{" "}
              <span className="font-semibold">Next</span>.
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
          <span>🗺️</span> Courses &amp; Tees
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            All WA golf courses are pre-loaded in Golf Nuts — there is nothing to import. You search
            for a course inline when starting a round (Step 1) or creating an event (Step 2). Type
            at least two characters and results appear instantly.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Tee selection</span> — After choosing a
            course, pick the tee set you are playing from. Each tee displays the Course Rating, Slope
            Rating, total length in metres, and Par. Tees are listed longest first.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Course detail pages</span> — Tapping a
            course name anywhere in the app opens its detail page, which shows all tee sets with a
            full hole-by-hole breakdown of distances and pars, plus the club&apos;s address, postcode,
            and phone number where available. Tap the phone number to call directly.
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
            A tournament groups a set of players under a single competition — the organiser
            arranges them into groups, each group plays their own round, and a shared leaderboard
            tracks the results.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Creating an event</span> — Tap{" "}
            <span className="font-semibold">+ New Event</span> on the{" "}
            <Link href="/tournaments" className="text-fairway-700 underline">
              Events page
            </Link>
            . A four-step wizard walks you through:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-1">
            <li>
              <span className="font-semibold">Event details</span> — give the event a name and an
              optional date.
            </li>
            <li>
              <span className="font-semibold">Course &amp; tee</span> — search for the course and
              choose the default tee. Tees show Course Rating, length, and Par.
            </li>
            <li>
              <span className="font-semibold">Format</span> — choose the scoring format (same
              options as a regular round).
            </li>
            <li>
              <span className="font-semibold">Invite players</span> — select who to invite.
              Invited players receive a push notification if they have notifications enabled on their{" "}
              <Link href="/profile" className="text-fairway-700 underline">
                Profile
              </Link>
              .
            </li>
          </ol>
          <p>
            The tournament opens with an{" "}
            <span className="font-semibold">UPCOMING</span> status badge while you wait for players
            to accept.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Prize holes</span> — During event
            creation you can designate specific holes as prize holes. Each hole can be marked as{" "}
            <span className="font-semibold">Longest Drive</span> or{" "}
            <span className="font-semibold">Nearest the Pin</span>. These appear on the event page
            so all players know which holes carry extra competition.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Arranging groups</span> — Once
            players have accepted, the organiser assigns them into groups on the tournament page.
            Use the <span className="font-semibold">+ Add player</span> dropdown to manually fill
            each group (up to four players), or tap{" "}
            <span className="font-semibold">Randomise Teams</span> to auto-assign everyone at once.
            Each group can be given its own tee if the course has multiple tee sets. When all
            accepted players are assigned, tap{" "}
            <span className="font-semibold">Save groups</span>.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Starting the round</span> — After
            groups are saved, tap <span className="font-semibold">Start Round</span>. This creates
            a live round for each group simultaneously. Each group scores their own round
            independently via the Score tab.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Live leaderboard</span> — While the
            tournament is{" "}
            <span className="font-semibold">ACTIVE</span>, the tournament page shows a live
            leaderboard across all groups. Once all rounds are finished the organiser can tap{" "}
            <span className="font-semibold">Mark tournament complete</span> to lock the final
            results.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Status badges</span>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <span className="font-semibold">UPCOMING</span> — event created, waiting for players
              to accept and groups to be arranged.
            </li>
            <li>
              <span className="font-semibold">ACTIVE</span> — rounds are underway.
            </li>
            <li>
              <span className="font-semibold">COMPLETE</span> — all rounds finished and results
              locked.
            </li>
          </ul>
        </div>
      </div>
      {/* Notifications */}
      <div
        id="notifications"
        className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20"
      >
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>🔔</span> Notifications
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            Golf Nuts can send a push notification directly to your phone when you are invited to a
            tournament. You can then accept or decline the invitation without even opening the app.
          </p>

          <p>
            <span className="font-semibold text-fairway-900">Enabling notifications</span> — Go to
            your{" "}
            <Link href="/profile" className="text-fairway-700 underline">
              Profile page
            </Link>{" "}
            and scroll to the <span className="font-semibold">Notifications</span> section. Toggle{" "}
            <span className="font-semibold">Tournament invitations</span> on. Your browser will ask
            for permission — tap <span className="font-semibold">Allow</span>.
          </p>

          <p>
            <span className="font-semibold text-fairway-900">Responding from a notification</span>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <span className="font-semibold">Android (Chrome)</span> — the notification appears in
              your notification shade with <span className="font-semibold">Accept</span> and{" "}
              <span className="font-semibold">Decline</span> buttons. Tap either to respond without
              opening the app, or tap the notification body to open the tournament page directly.
            </li>
            <li>
              <span className="font-semibold">iPhone / iPad (Safari)</span> — you must first add
              Golf Nuts to your home screen (see the Dashboard section above). Once installed, the
              notification will appear — tap it to open the tournament page and respond there.
              Action buttons are not supported on iOS.
            </li>
          </ul>

          <p>
            <span className="font-semibold text-fairway-900">Disabling notifications</span> — Toggle
            the same switch off on your Profile page. You can also revoke permission in your
            browser or phone settings at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
