# Golf Nuts

A full-stack golf scoring app for a group of friends — rounds, handicaps and events — built with Next.js 16, Prisma 7, and PostgreSQL.

## Features

- **Game formats** — Strokeplay, Stableford, Match Play, Skins and Ambrose, over 18 holes or 9 (front or back nine, labelled with the course's nine names where the tee has them)
  - **Stableford** — individual, or a **2-ball / 4-ball** team scramble with an Ambrose-style team handicap and points on the team's net score
  - **Ambrose** — one choice with a **2-ball / 4-ball** option; team handicap = sum of the team's handicaps ÷ (2 × players in the team), so short teams (e.g. threes) are handled fairly
  - **Skins** — optional **carry over halved holes** (on: a tied hole's skin rolls on; off: every skin is worth 1)
  - **Match Play** — two players, casual rounds only; the higher handicap receives the difference on the hardest holes; live match status and a "wins 3&2" result (holes after the match is decided don't count) with a hole-by-hole column
- **Round wizard** — course and tee search, format picker (Strokeplay by default, with each format's options inside its card), player search (selected players listed above the search box), and a **Teams** step for team games that auto-splits players by handicap and lets you move them
- **Handicap strokes in games** — full playing handicap placed by stroke index; a plus handicap gives strokes back on the easiest holes
- **Scorecards** — a round can only be finished once every player (or team) has a score on every hole (Match Play: until the match is decided); a warning lists the missing holes with a jump to the first; per-hole strokes, penalties, putts, fairways hit and GIR; one card per team for team games (showing Stableford points); hole info and a Google Maps hole view; failed saves keep you on the hole with a retry message; finished rounds can be edited; Out/In subtotals and a ✓ beside each hole's skin winner on the round summary
- **Handicap (WHS)** — score differentials use an adjusted score capped at **net double bogey** (unplayed holes count as net par; 14 of 18 or 7 of 9 holes needed); 9-hole rounds count straight away using the **2024 expected-score** method; index = best N of the last 20 with the WHS adjustments; recalculated when a round is finished, edited, deleted or excluded; only Strokeplay counts
- **Courses** — all WA courses pre-loaded and searched inline; full tee data (rating, slope, par, hole distances in metres), tees sorted longest first; course pages show address, postcode and phone
- **Tournaments / events**
  - Create an event with a date, tee-off time, course and tee, format (not Match Play), and **9 or 18 holes**; details, including format options, are editable until it starts
  - Invite players with **Select all** / Clear all; invitees accept or decline on the event page or from the push notification, and the organiser can set each player's status (**Accepted / Declined / Pending**) from a dropdown
  - Groups arranged by hand or with **Randomise Teams**, which spreads players evenly (9 → 3/3/3) and pairs those who have played together least; team games get handicap-balanced teams, and short or uneven teams are flagged but allowed
  - Prize holes per nine (one Longest Drive on a par 5, up to two Nearest the Pin on par 3s), with scorer pop-ups and organiser-recorded winners
  - **Live tournament-wide leaderboard** on every player's scoring screen and the event page (points or net to par, players or teams, with a Thru column)
  - **One overall winner** with **countback** (back 9, last 6, last 3, then hole by hole) and a page explaining the steps; **Skins events have a winner per group** instead
  - Auto-completes when the last group finishes (the organiser can't close it early while a group is still playing); once complete the organiser can **lock scores** so players can't change them (the organiser can still correct any group's card, and unlock again); completed events move to **Previous Events** a day later; events that never started are hidden a week after their date
- **Guest players** — organisers add unregistered players (name + Handicap Index) to an event or casual round. Names can't clash with a member or another guest, guests can't sign in, and a member in their group scores for them. They are tagged "Guest" in results and have no handicap history. When a guest registers, the organiser assigns their scores to the new account, which moves their rounds, group places and prize wins and counts completed Strokeplay rounds towards the new member's handicap. Guests with no scores can be removed; guests with scores can be anonymised to "Guest N", and unclaimed guests are anonymised automatically after 12 months
- **Stats & charts** — handicap trend chart, average score (18- and 9-hole rounds separately), fairways and GIR, recent rounds with score to par and an include/exclude handicap switch
- **Auth** — email/password login; **passkey (biometric) login** via WebAuthn; password reset by emailed link (signs you in, and allows a new password without the old one for 15 minutes); welcome email on registration
- **Profile** — avatar upload, profile details, password, notification and passkey settings
- **Push notifications** — tournament invitations with Accept / Decline actions (Android Chrome; iOS when installed as a PWA)
- **PWA** — installable, with a service worker and an in-app install prompt

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL via Prisma 7 |
| Auth | NextAuth v5 + WebAuthn passkeys (SimpleWebAuthn) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Animation | Framer Motion |
| Validation | Zod |
| Email | Nodemailer 10 |
| Push Notifications | web-push (VAPID) |
| Process manager (production) | PM2 |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and fill in your values:

```bash
cp .env.example .env
```

For local development, put `NEXTAUTH_URL="http://localhost:3001"` in `.env.development.local`.

3. Run database migrations:

```bash
npx prisma migrate dev
```

4. (Optional) Seed with Western Australia golf courses (reads `data/wa_courses_full.json`):

```bash
npx prisma db seed
```

5. Start the development server **on port 3001**:

```bash
PORT=3001 npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

> The port must match `NEXTAUTH_URL`. Plain `npm run dev` starts on port 3000, and login would then redirect to a port with nothing running on it.

## Environment Variables

See [.env.example](.env.example) for all required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — random 32-character secret for session signing
- `NEXTAUTH_URL` — base URL of the app (e.g. `http://localhost:3001` in development); also used as the passkey origin and in email links
- `WEBAUTHN_RP_ID` — passkey relying-party ID: the app's domain without scheme or port (e.g. `localhost` in development)
- `GOOGLE_MAPS_API_KEY` — Google Maps API key (server-side only)
- `SMTP_*` — SMTP credentials for transactional emails (password reset and welcome email)
- `VAPID_PUBLIC_KEY` — VAPID public key for web push notifications (generate once with `web-push`)
- `VAPID_PRIVATE_KEY` — VAPID private key for web push notifications
- `VAPID_SUBJECT` — contact email used in VAPID header (e.g. `mailto:you@example.com`)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — same value as `VAPID_PUBLIC_KEY`; exposed to the browser for push subscription

## Project Structure

```
app/
  (app)/          # Authenticated routes (dashboard, rounds, courses, tournaments, stats, guide, profile)
  (auth)/         # Auth routes (login, register, reset-password)
  actions/        # Server actions (auth, profile)
  api/            # API route handlers
  generated/      # Prisma-generated client (gitignored; `npx prisma generate`)
components/
  push/           # Push notification toggle
  tournament/     # Event UI (group builder, leaderboard, prize holes, invitee status, results summary)
  FormatPicker.tsx          # Game format picker (Ambrose / Stableford 2-ball·4-ball, Skins carry-over)
  HolesPicker.tsx           # 9/18-hole and front/back nine selector
  SkinsCarryOverToggle.tsx  # "Carry over halved holes" checkbox
data/             # Course JSON used by the seed (gitignored)
lib/
  apiError.ts           # Reads error messages from API responses (client)
  auth.ts               # NextAuth config (credentials + reset-token sign-in, reset window)
  countback.ts          # Countback tie-breaking, with a step-by-step trace for the explanation page
  email.ts              # Nodemailer transactional email (welcome, password reset)
  formats.ts            # Format scoring (strokeplay, stableford, team stableford, match play, skins, ambrose)
  gameFormats.ts        # Format lists, labels, team sizes (single source for pickers and validation)
  handicap.ts           # WHS: course handicap, net double bogey, differentials, index table
  nines.ts              # 9-hole helpers (holes in play, nine names)
  prisma.ts             # Prisma client instance
  prizeHoles.ts         # Prize-hole rules
  push.ts               # Web push (VAPID)
  recalcHandicap.ts     # Records round differentials and rebuilds a player's index
  staleTournaments.ts   # Hides / prunes never-started events past their date
  teams.ts              # Team splits by handicap, uneven-team warnings and hints
  tournamentStandings.ts# Tournament standings, winners, Skins group results, countback explanation
  webauthn.ts           # Passkey (WebAuthn) settings and challenge handling
prisma/
  schema.prisma   # Database schema
  migrations/     # SQL migrations (applied in production with `prisma migrate deploy`)
  seed.ts         # Database seeding script
scripts/          # Local one-off maintenance scripts (gitignored; e.g. recalc-all-handicaps.ts --rebuild)
types/            # TypeScript declarations (NextAuth session)
proxy.ts          # Next.js 16 route protection (replaces middleware.ts)
```

## Testing

An end-to-end Puppeteer workflow test covers login, the round wizard, scoring, stats, courses, the guide, tournaments (create and detail) and the profile page:

```bash
node .claude/skills/workflow-test/scripts/run-workflow-test.mjs
```

It reads its test account from `.claude/workflow-test.json` and the port from `.claude/deploy.json`. It reuses a dev server already running on port 3001, or starts one and stops it afterwards. The full run creates a round and a test event in the local database. Run `--steps=G,H` for a subset; login always runs.

Before merging, also run:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

## Deployment

Production runs `next start -p 3001` under PM2 (its `ecosystem.config.js` lives on the server, not in the repo). A deploy pulls `main`, installs dependencies, runs `npx prisma generate` and `npx prisma migrate deploy` (after a database backup when there are new migrations), builds, and restarts the PM2 process.

## Notes

This project uses **Next.js 16** and **Prisma 7**, both of which have breaking changes from their previous major versions:

- Next.js 16 uses `proxy.ts` instead of `middleware.ts` for route protection
- Prisma 7 requires `@prisma/adapter-pg` — no `url` in schema datasource; client is imported from `@/app/generated/prisma/client`
- `DateTime` columns are stored as UTC timestamps without a time zone; compare against `now() at time zone 'utc'` in raw SQL
