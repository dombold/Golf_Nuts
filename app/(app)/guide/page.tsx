import Link from "next/link";

const sections = [
  { id: "dashboard", icon: "🏠", title: "Dashboard" },
  { id: "play", icon: "⛳", title: "Playing a Round" },
  { id: "scoring", icon: "📋", title: "Live Scoring" },
  { id: "courses", icon: "🗺️", title: "Courses & Tees" },
  { id: "stats", icon: "📊", title: "Stats & Handicap" },
  { id: "tournaments", icon: "🏆", title: "Events & Tournaments" },
  { id: "countback", icon: "🔢", title: "Tie-Breaking (Countback)" },
  { id: "notifications", icon: "🔔", title: "Notifications" },
  { id: "profile", icon: "👤", title: "Profile & Sign-in" },
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
              A <span className="font-semibold">Round in progress</span> card appears for any round
              you haven&apos;t finished — tap <span className="font-semibold">Resume</span> to carry
              on scoring, or <span className="font-semibold">Discard</span> to delete it.
            </li>
            <li>
              <span className="font-semibold">Recent Rounds</span> lists your five most recent
              finished rounds (newest round date first). Tap one to view its full scorecard and
              result summary.
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
            Starting a round takes three steps — four for a team game with more than one team. Tap{" "}
            <span className="font-semibold">Play</span> in the navigation to begin.
          </p>

          <div>
            <p className="font-semibold text-fairway-700 mb-1">Step 1 — Select course and tee</p>
            <p>
              Type at least two characters in the search box to find your course — all WA courses
              are pre-loaded. Tap the course to select it, then choose the tee you are playing from
              — each tee shows the Course Rating, total length in metres, and Par. Tees are listed
              longest first. Select <span className="font-semibold">9 holes</span> or{" "}
              <span className="font-semibold">18 holes</span>. For 9 holes, choose{" "}
              <span className="font-semibold">which nine</span> — front or back (named after the
              course&apos;s nines, such as &ldquo;Red&rdquo; and &ldquo;Blue&rdquo;, where the tee has them).
              Then tap <span className="font-semibold">Next</span>.
            </p>
          </div>

          <div>
            <p className="font-semibold text-fairway-700 mb-2">Step 2 — Choose a format</p>
            <p className="mb-2">
              Strokeplay is selected to start with. Some formats show extra choices inside their card
              once you pick them: Stableford (Individual, 2-ball or 4-ball), Skins (carry over halved
              holes) and Ambrose (2-ball or 4-ball).
            </p>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-fairway-900">Strokeplay</span> — lowest{" "}
                <span className="font-semibold">net</span> score wins (your gross strokes minus the
                handicap strokes you receive). Strokeplay rounds count toward your Handicap Index — see{" "}
                <a href="#stats" className="text-fairway-700 underline">Stats &amp; Handicap</a>.
              </li>
              <li>
                <span className="font-semibold text-fairway-900">Stableford</span> — you earn points
                per hole based on your net score: 5 for an albatross or better, 4 for an eagle, 3 for
                a birdie, 2 for par, 1 for bogey, 0 for double-bogey or worse. Your handicap strokes
                are applied per hole so all skill levels compete fairly. After picking Stableford,
                choose <span className="font-semibold">Individual</span>,{" "}
                <span className="font-semibold">2-ball</span> or{" "}
                <span className="font-semibold">4-ball</span>. In 2-ball and 4-ball everyone hits,
                the team picks the best shot and all play their next shot from there, just like
                Ambrose, and the team records one score per hole. Points are scored on the
                team&apos;s net score using the Ambrose team handicap (see below). Odd numbers are
                handled the same way as Ambrose.
              </li>
              <li>
                <span className="font-semibold text-fairway-900">Match Play</span> — hole-by-hole
                competition between <span className="font-semibold">two players</span>: win a hole,
                lose a hole, or halve it, on net strokes. The live leaderboard shows the match status
                (e.g. &ldquo;Alice 2 UP&rdquo;), and the round summary shows the result (e.g.
                &ldquo;Alice wins 3&amp;2&rdquo;) plus who won each hole. Match Play is for casual
                rounds only — it isn&apos;t offered for events.
              </li>
              <li>
                <span className="font-semibold text-fairway-900">Skins</span> — each hole is worth
                one skin. Win a hole outright (no ties) to claim it. When you pick Skins, a{" "}
                <span className="font-semibold">Carry over halved holes</span> checkbox appears inside
                the Skins card: on (the
                default), a tied hole&apos;s skin rolls on to the next hole, so one win can be worth
                several skins; off, a tied hole&apos;s skin is lost and every skin is worth 1. For an
                event the organiser can change this until the event starts. On the round summary
                scorecard, a green <span className="font-semibold text-green-600">✓</span> marks who
                won each hole&apos;s skin (with the number of skins when a carried-over win is worth
                more than one).
              </li>
              <li>
                <span className="font-semibold text-fairway-900">Ambrose</span> — a team scramble:
                everyone hits, the team picks the best shot and all play their next shot from that
                spot, all the way to the hole. The team records one score per hole. After picking
                Ambrose, choose <span className="font-semibold">2-ball</span> (teams of two) or{" "}
                <span className="font-semibold">4-ball</span> (teams of four).
              </li>
            </ul>

            <div className="bg-fairway-50/60 rounded-lg p-3 space-y-2 mt-2">
              <p className="font-semibold text-fairway-900">Ambrose team handicap</p>
              <p>
                The team receives a combined handicap calculated as the{" "}
                <span className="font-semibold">sum of the team&apos;s handicaps divided by twice the number of players in the team</span>{" "}
                — which is the same as the average handicap halved. It uses the team&apos;s actual
                size, so a short team is handled fairly.
              </p>
              <div className="space-y-1 text-gray-600">
                <p>2-player team: (H1 + H2) ÷ 4</p>
                <p>3-player team: (H1 + H2 + H3) ÷ 6</p>
                <p>4-player team: (H1 + H2 + H3 + H4) ÷ 8</p>
                <p>Player on their own: H ÷ 2</p>
              </div>
              <p className="text-gray-500 text-xs">
                Example: a four-player team with handicaps of 10, 14, 18, and 22 receives a team
                handicap of (10 + 14 + 18 + 22) ÷ 8 = <span className="font-semibold">8</span>.
              </p>
              <p className="font-semibold text-fairway-900 pt-1">Odd numbers of players</p>
              <p>
                If an odd number of players accept a 2-player Ambrose event, one team will be
                short. Before the event starts the organiser can switch it to 4-player Ambrose (Edit
                event details). With 9 players, for example, <span className="font-semibold">Randomise
                Teams</span> makes three groups of three, and each group plays as a team of three.
                In 2-player Ambrose, Randomise pairs each group&apos;s lowest handicap with its
                highest. Changing the format re-sorts the saved teams to match. The group builder
                warns about any short or uneven teams, but lets you go ahead. The same applies to
                Stableford 2-ball / 4-ball.
              </p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-fairway-700 mb-1">Step 3 — Select players</p>
            <p>
              You are always included. Type part of a name in the{" "}
              <span className="font-semibold">search box</span> to narrow the list, then tap a player
              to add them — players in the round are listed above the search box (tap one to remove
              them). For Match Play, pick exactly one opponent. Then tap{" "}
              <span className="font-semibold">Tee Off!</span> to begin — or, for a team game with more
              than one team, <span className="font-semibold">Next: Teams</span>.
            </p>
          </div>

          <div>
            <p className="font-semibold text-fairway-700 mb-1">Step 4 — Teams (team games only)</p>
            <p>
              For Ambrose, or Stableford 2-ball / 4-ball, with more players than one team, the Teams
              step opens with everyone split by handicap to keep the teams even (lowest paired with
              highest). Each team shows its team handicap. Use the{" "}
              <span className="font-semibold">Team</span> menu beside a player to move them; any
              short or uneven team is flagged, but you can still tee off.
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
            numbered dots below the score cards shows the holes you are playing (just the nine you
            chose for a 9-hole round). Tap any dot to jump to that hole. The current hole is
            highlighted in green; completed holes are filled in.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Entering a score</span> — Use the{" "}
            <span className="font-semibold">−</span> and <span className="font-semibold">+</span>{" "}
            buttons to set each player&apos;s gross strokes. The score badge on each player card
            updates instantly — dark green for eagle or better, medium green for birdie, no colour
            for par, amber for bogey, red for double-bogey or worse.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Team games</span> — In Ambrose and
            Stableford 2-ball / 4-ball there is one card per team instead of per player. Enter the
            team&apos;s score for the hole (best ball each shot). The card shows the team handicap,
            the strokes the team receives on the hole and its net par — and, for Stableford, the
            points the team earned.
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
            <span className="font-semibold">Save &amp; Hole N →</span> (N is the next hole). Scores
            are saved to the server immediately. If a save fails — for example with no phone signal
            — you stay on the hole and a message asks you to try again, so nothing is lost. You can
            go back to any previous hole at any time and change a score.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Leaderboard tab</span> — Tap{" "}
            <span className="font-semibold">Leaderboard</span> at the top of the scorecard to see a
            live running total for all players (or teams). Stableford shows cumulative points; all
            other formats show net score relative to par. For Match Play it also shows the match
            status, such as &ldquo;Alice 2 UP&rdquo;.
          </p>
          <p>
            In a <span className="font-semibold text-fairway-900">tournament</span>, the Leaderboard
            tab shows the <span className="font-semibold">whole event</span> — every group ranked
            together, with a <span className="font-semibold">Thru</span> column (holes played) and
            your own group highlighted. It refreshes each time you open the tab and every 30
            seconds while it is open. In a <span className="font-semibold">Skins</span> event it
            shows each group&apos;s own skins game instead, since every group plays for its own skins.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Prize holes</span> — In a tournament,
            a pop-up appears when you reach a Longest Drive or Nearest the Pin hole, so the group
            remembers to measure.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Finishing the round</span> — On the
            final hole, tap <span className="font-semibold">Finish Round</span> instead of Save
            &amp; Hole. You will be taken to the round summary, and your Handicap Index is
            recalculated automatically if it was a Strokeplay round.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Fixing a finished round</span> — Open
            the round summary and tap <span className="font-semibold">Edit Scores</span>. Changes
            save straight away, and a Strokeplay round&apos;s handicap differential is updated to
            match. <span className="font-semibold">Delete</span> on the round summary removes a
            casual round; a round that is part of an event can&apos;t be deleted on its own —
            delete the event instead.
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
            </Link>{" "}
            and on the Dashboard. It is calculated with the World Handicap System (WHS) and updates
            automatically whenever you finish a Strokeplay round, edit the scores of a finished one,
            delete one, or switch a round in or out of your handicap. Only Strokeplay rounds count —
            Stableford, Match Play, Skins, and Ambrose rounds never affect your index.
          </p>

          <div className="bg-fairway-50/60 rounded-lg p-3 space-y-2">
            <p className="font-semibold text-fairway-900">1. Each round becomes a Score Differential</p>
            <p>
              A Score Differential measures how well you played compared with the difficulty of the
              course:
            </p>
            <p className="font-mono text-xs bg-white rounded px-2 py-1.5 text-fairway-900">
              (Adjusted score − Course Rating) × 113 ÷ Slope Rating
            </p>
            <p>
              The <span className="font-semibold">adjusted score</span> is your gross score with any
              blow-up holes capped at <span className="font-semibold">net double bogey</span> — par
              + 2 + the handicap strokes you receive on that hole. A hole you didn&apos;t finish counts
              as net par (par + your strokes). Your scorecard and results still show what you
              actually scored; the cap only applies to your handicap.
            </p>
            <p>
              Your handicap strokes come from your{" "}
              <span className="font-semibold">Course Handicap</span> for the tee you played
              (Handicap Index × Slope ÷ 113 + Course Rating − Par). The strokes go on the hardest
              holes first, by stroke index. A plus handicap gives strokes back, starting with the
              easiest holes.
            </p>
            <p>
              A round only counts if you scored at least{" "}
              <span className="font-semibold">14 holes</span> of an 18-hole round, or{" "}
              <span className="font-semibold">7 holes</span> of a 9-hole round.
            </p>
            <p className="text-gray-500 text-xs">
              Example: you get 1 stroke on a par 4 and take 9 — it counts as 7 for your handicap.
            </p>
          </div>

          <div className="bg-fairway-50/60 rounded-lg p-3 space-y-2">
            <p className="font-semibold text-fairway-900">9-hole rounds</p>
            <p>
              A 9-hole Strokeplay round counts toward your index straight away, just like an 18-hole
              round, using the WHS method introduced in 2024. The nine you played is turned into a
              differential (using half the course rating and a Course Handicap for nine holes), then
              the <span className="font-semibold">expected score for the other nine</span> is added
              to make a full 18-hole differential. The expected score is 0.52 × your Handicap Index
              + 1.2.
            </p>
            <p className="text-gray-500 text-xs">
              Example: with a 10.0 index, a nine that works out to a 4.0 differential gets 6.4 added
              (0.52 × 10 + 1.2), giving an 18-hole differential of 10.4.
            </p>
          </div>

          <div className="bg-fairway-50/60 rounded-lg p-3 space-y-2">
            <p className="font-semibold text-fairway-900">2. Your index is the average of your best differentials</p>
            <p>
              Golf Nuts looks at the differentials from your{" "}
              <span className="font-semibold">last 20 counting rounds</span> (9- and 18-hole rounds
              each count as one) and averages the lowest ones:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>3 rounds: best 1, minus 2.0</li>
              <li>4 rounds: best 1, minus 1.0</li>
              <li>5 rounds: best 1</li>
              <li>6 rounds: best 2, minus 1.0</li>
              <li>7–8 rounds: best 2</li>
              <li>9–11 rounds: best 3</li>
              <li>12–14 rounds: best 4</li>
              <li>15–16 rounds: best 5</li>
              <li>17–18 rounds: best 6</li>
              <li>19 rounds: best 7</li>
              <li>20 rounds: best 8</li>
            </ul>
            <p>
              Until you have <span className="font-semibold">3 counting rounds</span>, the handicap
              on your{" "}
              <Link href="/profile" className="text-fairway-700 underline">
                Profile
              </Link>{" "}
              (the one you entered when you signed up) is used. After that it is replaced
              automatically each time your index is recalculated.
            </p>
            <p>
              Net double bogey and the 9-hole expected score both use{" "}
              <span className="font-semibold">your Handicap Index when you played the round</span>,
              so editing an old round later doesn&apos;t change the index it was measured against.
            </p>
          </div>

          <p>
            <span className="font-semibold text-fairway-900">Excluding a round</span> — In the{" "}
            <span className="font-semibold">Recent Rounds</span> table on the Stats page, use the{" "}
            <span className="font-semibold">HCP</span> switch on any round to include it in or
            exclude it from your handicap. The round stays in your history but its differential is
            removed from the index calculation immediately. Non-Strokeplay rounds are excluded by
            default.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Handicap Trend chart</span> — Shows
            your Handicap Index at the time of each of your last 20 Strokeplay rounds, so you can see
            which way it is heading. A falling line means you are improving. The chart appears once
            you have finished two Strokeplay rounds.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Summary tiles</span> — Three tiles
            show your averages across recent rounds:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <span className="font-semibold">Avg Score</span> — your average gross score for
              18-hole rounds. If you have played 9-hole rounds, their average is shown underneath
              (the two are kept separate so 9-hole scores don&apos;t pull the average down).
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
            to 20 rounds with date, course, gross score (and score to par), FIR%, GIR%, average
            putts per hole, and the HCP switch. For 9-hole rounds, the score to par is measured
            against the par of the nine you played. Scroll horizontally on mobile to see all
            columns.
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
            arranges them into groups, each group plays their own round, and one shared leaderboard
            ranks everyone across all groups.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Creating an event</span> — Tap{" "}
            <span className="font-semibold">+ New Event</span> on the{" "}
            <Link href="/tournaments" className="text-fairway-700 underline">
              Events page
            </Link>
            . The wizard walks you through:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-1">
            <li>
              <span className="font-semibold">Event details</span> — give the event a name and an
              optional date.
            </li>
            <li>
              <span className="font-semibold">Course, tee &amp; holes</span> — search for the course,
              choose the default tee (showing Course Rating, length, and Par), and pick{" "}
              <span className="font-semibold">9 or 18 holes</span> — for 9 holes, the front or back
              nine.
            </li>
            <li>
              <span className="font-semibold">Format</span> — choose the scoring format. The
              options are the same as a regular round (Strokeplay is selected to start with), except
              Match Play, which is for two players only. Tick{" "}
              <span className="font-semibold">Prize Holes</span> if you want Longest Drive / Nearest
              the Pin holes.
            </li>
            <li>
              <span className="font-semibold">Prize holes</span> (only if ticked) — choose the
              holes (see below).
            </li>
            <li>
              <span className="font-semibold">Invite players</span> — tap{" "}
              <span className="font-semibold">Select all</span> to invite everyone, then tap anyone
              you want to leave out (the &ldquo;N of M selected&rdquo; count keeps track). Invited
              players receive a push notification if they have notifications enabled on their{" "}
              <Link href="/profile" className="text-fairway-700 underline">
                Profile
              </Link>
              .
            </li>
          </ol>
          <p>
            The tournament opens with an{" "}
            <span className="font-semibold">UPCOMING</span> status badge while you wait for players
            to respond. While it is upcoming, the organiser can tap{" "}
            <span className="font-semibold">Edit event details</span> to change the name, date,{" "}
            <span className="font-semibold">tee-off time</span>, format (including the 2-ball /
            4-ball choice and Skins carry-over), course, tee, or holes. Changing the course, tee, or
            nine clears any prize holes that no longer apply, and changing to a different team size
            re-sorts any saved teams.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Responding to an invitation</span> —
            Open the event (from the Events page or the invite banner on your Dashboard) and tap{" "}
            <span className="font-semibold">Accept</span> or{" "}
            <span className="font-semibold">Decline</span>. On Android you can also respond straight
            from the push notification (see Notifications below).
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Setting players&apos; responses</span> —
            If someone tells you in person whether they&apos;re playing, the organiser can set it for
            them. In the <span className="font-semibold">Players</span> list on the event page, use
            the dropdown next to their name to choose{" "}
            <span className="font-semibold">Accepted</span>,{" "}
            <span className="font-semibold">Declined</span> or{" "}
            <span className="font-semibold">Pending</span>. When a player answers the invitation
            themselves, their dropdown updates to match. This works until the event starts. Moving a player to Declined or Pending takes them out of their group; a
            group left empty is removed.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Prize holes</span> — Each prize hole is
            marked as <span className="font-semibold">Longest Drive</span> (par 5s) or{" "}
            <span className="font-semibold">Nearest the Pin</span> (par 3s). You can select one
            Longest Drive and up to two Nearest the Pin holes per nine, from the holes being played.
            Prize holes appear on the event page, and scorers get a reminder when they reach one.
            Once the event has started, the organiser taps{" "}
            <span className="font-semibold">Record winners</span> on the Prize Holes card and picks
            each hole&apos;s winner from the player list.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Arranging groups</span> — Once
            players have accepted, the organiser assigns them into groups on the tournament page.
            Use the <span className="font-semibold">+ Add player</span> dropdown to manually fill
            each group (up to four players), or tap{" "}
            <span className="font-semibold">Randomise Teams</span> to auto-assign everyone at once —
            it spreads players evenly across the groups (5 players make groups of 3 and 2; 9 make
            three groups of 3) and puts together players who have played with each other least.
            Each group can be given its own tee if the course has multiple tee sets. When all
            accepted players are assigned, tap <span className="font-semibold">Save groups</span>.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Teams in a group</span> — For 2-ball
            games (Ambrose or Stableford) each player in a group has{" "}
            <span className="font-semibold">Team 1 / Team 2</span> buttons; Randomise fills them in
            with handicap-balanced pairs. For 4-ball games each group plays as one team. If the
            number of players doesn&apos;t divide evenly, the group builder shows a hint (for
            example, suggesting 4-ball in groups of 3) and lists any short or uneven teams — you can
            still save and start.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Starting the round</span> — After
            groups are saved, tap <span className="font-semibold">Start Round</span>. This creates
            a live round for each group simultaneously. Each group scores their own round
            independently via the Score tab.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Live leaderboard</span> — While the
            tournament is <span className="font-semibold">ACTIVE</span>, the tournament page and
            every player&apos;s Leaderboard tab show one live leaderboard across all groups —
            Stableford by points, other formats by net score to par — with how many holes each
            player or team has played. Skins events are the exception: each group plays its own
            skins game, so the leaderboard shows a card per group with everyone&apos;s skins.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Finishing and the winner</span> — When
            the last group taps <span className="font-semibold">Finish Round</span>, the event
            completes automatically (the organiser can also tap{" "}
            <span className="font-semibold">Mark tournament complete</span> if a group can&apos;t
            finish). There is <span className="font-semibold">one overall winner</span> — the best
            player or team across all groups — shown in the{" "}
            <span className="font-semibold">Final Results</span> on the event page. Ties are decided
            by{" "}
            <a href="#countback" className="text-fairway-700 underline">
              countback
            </a>
            . Each group&apos;s round summary shows only that group&apos;s results, not a winner.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Skins events</span> — Because each
            group plays for its own skins, there is a winner{" "}
            <span className="font-semibold">per group</span> rather than one overall winner. Each
            group&apos;s round summary shows a &ldquo;Group N winner&rdquo; banner, and the Final
            Results list every group&apos;s winner. Players level on skins share the win.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Corrections</span> — If a score needs
            fixing after the event has finished, open that group&apos;s round summary and tap{" "}
            <span className="font-semibold">Edit Scores</span>. The leaderboard and winner update
            automatically.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Events page</span> — Completed events
            show their winner (or each group&apos;s winner for Skins) and the Longest Drive /
            Nearest the Pin winners. A day after an event
            finishes it moves into <span className="font-semibold">Previous Events</span> at the
            bottom of the page. Events that never started are removed a week after their date.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Status badges</span>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <span className="font-semibold">UPCOMING</span> — event created, waiting for players
              to respond and groups to be arranged.
            </li>
            <li>
              <span className="font-semibold">ACTIVE</span> — rounds are underway.
            </li>
            <li>
              <span className="font-semibold">COMPLETE</span> — all groups have finished and the
              winner is shown. Scores can still be corrected, and results update automatically.
            </li>
          </ul>
        </div>
      </div>
      {/* Tie-Breaking (Countback) */}
      <div id="countback" className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20">
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>🔢</span> Tie-Breaking (Countback)
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            When two or more players or teams finish level at the top, Golf Nuts automatically
            applies the standard{" "}
            <span className="font-semibold text-fairway-900">scorecard countback</span> to
            decide the winner. This applies to Strokeplay, Stableford (individual, 2-ball and
            4-ball) and Ambrose. Strokeplay and Ambrose compare net scores, and the lower total wins
            each step. In Stableford the comparison uses points, and the higher total wins each
            step. Skins has no countback — players level on skins share the win.
          </p>

          <div className="bg-fairway-50 rounded-lg p-3 space-y-2">
            <p className="font-semibold text-fairway-900">Countback order (18-hole round)</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>
                <span className="font-semibold">Back 9</span> — best net score on holes 10–18
              </li>
              <li>
                <span className="font-semibold">Last 6 holes</span> — best net score on holes 13–18
              </li>
              <li>
                <span className="font-semibold">Last 3 holes</span> — best net score on holes 16–18
              </li>
              <li>
                <span className="font-semibold">Last hole</span> — hole 18, then hole 17, 16… back
                up the card
              </li>
            </ol>
          </div>

          <p>
            For <span className="font-semibold text-fairway-900">9-hole rounds</span> the same
            principle applies using the available holes — last 5, last 3, last hole, and so on.
          </p>

          <p>
            With <span className="font-semibold text-fairway-900">three or more</span> tied,
            anyone who falls behind at a step drops out, and the rest carry on to the next step.
          </p>

          <p>
            When a tie is broken this way, the winner shows a label such as{" "}
            <span className="font-semibold text-fairway-900">&ldquo;Won on back 9&rdquo;</span> or{" "}
            <span className="font-semibold text-fairway-900">&ldquo;Won on hole 18&rdquo;</span> —
            in the round summary for casual rounds, and for events in the winner banner on the
            Final Results and on the Events page. For events, tap the label to see{" "}
            <span className="font-semibold">how the countback was decided</span>: each step with
            everyone&apos;s totals, and a hole-by-hole table with the deciding holes highlighted.
          </p>

          <p>
            If every hole is identical and the tie still cannot be broken, both players or teams
            share the position — no countback winner is declared.
          </p>
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

      {/* Profile & Sign-in */}
      <div id="profile" className="bg-white rounded-xl border border-fairway-50 p-4 scroll-mt-20">
        <h2 className="text-lg font-semibold text-fairway-900 flex items-center gap-2 mb-3">
          <span>👤</span> Profile &amp; Sign-in
        </h2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            Open your{" "}
            <Link href="/profile" className="text-fairway-700 underline">
              Profile page
            </Link>{" "}
            from the avatar in the top-right corner.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Profile photo &amp; details</span> —
            Tap your photo to upload a new one, and update your name and email in{" "}
            <span className="font-semibold">Profile Settings</span>.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Password</span> — Change it in the{" "}
            <span className="font-semibold">Password</span> section. If you have forgotten it, tap{" "}
            <span className="font-semibold">Forgot password?</span> on the login page — you will be
            emailed a reset link (valid for an hour) that signs you straight in. For the next 15
            minutes you can set a new password without entering the old one; after that the
            Password section asks for your current password as usual.
          </p>
          <p>
            <span className="font-semibold text-fairway-900">Biometric login</span> — In the{" "}
            <span className="font-semibold">Biometric Login</span> section, register your device to
            sign in with your fingerprint or Face ID (or your phone&apos;s PIN if biometrics
            aren&apos;t set up) instead of your password. Golf Nuts never sees your fingerprint or
            face — your phone checks it and confirms it&apos;s you. Next time, tap{" "}
            <span className="font-semibold">Use Biometrics</span> on the login page. Register each
            phone or computer you use separately.
          </p>
        </div>
      </div>
    </div>
  );
}
