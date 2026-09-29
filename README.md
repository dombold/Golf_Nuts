# Golf Nuts

A full-stack golf scoring and social web app built with Next.js 16, Prisma 7, and PostgreSQL.

## Features

- **Round tracking** — log rounds across multiple game formats: Strokeplay, Stableford, Match Play, Skins, Ambrose (2/4 player); play 18 holes or 9 (front or back nine, labelled with the course's nine names where the tee has them)
- **Scorecards** — per-hole scoring with strokes, penalties, putts, fairways hit, and GIR; hole info panel shows hole number, par, stroke index, and distance; Google Maps hole view displayed below the score entry cards; front/back nine (Out/In) subtotals on the round summary
- **Handicap system** — World Handicap System index tracking and history, including 9-hole rounds (course rating halved); non-Strokeplay rounds are excluded from the handicap by default, and any round can be included or excluded from the Stats page
- **Courses** — courses are searched and selected inline when starting a round or creating an event; full tee data shown (rating, slope, par, hole distances in metres); course detail pages display address, postcode, and phone number; tees sorted by total length descending
- **Tournaments / events**
  - Create an event with a date, tee-off time, course and tee, format, and **9 or 18 holes** (front or back nine)
  - Invite players with a **Select all** / Clear all option; invitees accept or decline on the event page or from the push notification, and the dashboard banner links to pending invites and your next event
  - Organiser arranges groups by hand or with **Randomise Teams** (pairs players who have played together least), then starts the round — each group gets its own scorecard
  - Prize holes per nine (one Longest Drive on a par 5, up to two Nearest the Pin on par 3s); scorers get a pop-up on prize holes, and the organiser records the **Longest Drive / Nearest the Pin winners** from a player list
  - **Live tournament-wide leaderboard** on every player's scoring screen and the event page — all groups ranked together (Stableford points, or net score to par), with a Thru column and your own group highlighted
  - **One overall winner** across all groups; ties are broken on **countback** (back 9, last 6, last 3, then hole by hole), and the "Won on …" label links to a page that explains the countback step by step
  - The event completes automatically when the last group finishes; group round summaries show group results only
  - The Tournaments page shows each completed event's winner and prize winners; completed events move to **Previous Events** a day after finishing, and events that never started are removed a week after their date
- **Stats & charts** — handicap trend chart, average score (18- and 9-hole rounds averaged separately), fairways and GIR; recent rounds show gross score and score to par (9-hole rounds measured against the par of the nine played)
- **Social** — friends, round comments, and likes
- **Auth** — email/password login; **passkey (biometric) login** via WebAuthn, managed on the profile page; password reset via emailed token link (auto-signs in, no current password required); password change on profile page with collapse toggle and per-field show/hide; password visibility toggle on login page; welcome email sent on registration
- **Profile** — avatar upload, profile details, notification and passkey settings
- **Push notifications** — invitees receive a phone notification when invited to a tournament, with Accept / Decline actions (Android Chrome; iOS when installed as PWA)
- **PWA** — installable as a Progressive Web App with service worker support and in-app install prompt banner

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
  (app)/          # Authenticated routes (dashboard, rounds, courses, tournaments, stats, etc.)
  (auth)/         # Auth routes (login, register, reset-password)
  actions/        # Server actions
  api/            # API route handlers
  generated/      # Prisma-generated client
components/
  charts/         # Recharts chart components
  leaderboard/    # Leaderboard UI
  push/           # Push notification toggle component
  scorecard/      # Scorecard entry UI
  tournament/     # Tournament UI (group builder, leaderboard, prize holes, results summary)
  ui/             # Shared UI components
  HolesPicker.tsx # 9/18-hole and front/back nine selector (rounds and events)
data/             # Static JSON data (courses; gitignored, used by the seed)
lib/
  auth.ts               # NextAuth config (credentials + reset-token sign-in, loginMethod JWT claim)
  countback.ts          # Countback tie-breaking, with a step-by-step trace for the explanation page
  email.ts              # Nodemailer transactional email (welcome email, password reset)
  formats.ts            # Game format scoring (strokeplay, stableford, match play, skins, ambrose)
  handicap.ts           # WHS differential and playing handicap calculations
  nines.ts              # 9-hole helpers (holes in play, nine names)
  prisma.ts             # Prisma client instance
  push.ts               # Web push notification utility (VAPID)
  recalcHandicap.ts     # Rebuilds a player's handicap index from their history
  tournamentStandings.ts# Tournament-wide standings, winner and countback explanation
  webauthn.ts           # Passkey (WebAuthn) relying-party settings
prisma/
  schema.prisma   # Database schema
  migrations/     # SQL migrations (applied in production with `prisma migrate deploy`)
  seed.ts         # Database seeding script
scripts/          # One-off maintenance scripts (e.g. create test users)
types/            # TypeScript type definitions
proxy.ts          # Next.js 16 route protection (replaces middleware.ts)
ecosystem.config.js # PM2 config for production
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

Production runs `next start -p 3001` under PM2 (see `ecosystem.config.js`). A deploy pulls `main`, installs dependencies, runs `npx prisma generate` and `npx prisma migrate deploy` (after a database backup when there are new migrations), builds, and restarts the PM2 process.

## Notes

This project uses **Next.js 16** and **Prisma 7**, both of which have breaking changes from their previous major versions:

- Next.js 16 uses `proxy.ts` instead of `middleware.ts` for route protection
- Prisma 7 requires `@prisma/adapter-pg` — no `url` in schema datasource; client is imported from `@/app/generated/prisma/client`
- `DateTime` columns are stored as UTC timestamps without a time zone; compare against `now() at time zone 'utc'` in raw SQL
