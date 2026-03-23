# Golf Nuts

A full-stack golf scoring and social web app built with Next.js 16, Prisma 7, and PostgreSQL.

## Features

- **Round tracking** — log rounds across multiple game formats: Strokeplay, Stableford, Match Play, Skins, Ambrose (2/4 player)
- **Scorecards** — per-hole scoring with strokes, penalties, putts, fairways hit, and GIR
- **Handicap system** — automatic handicap index tracking and history
- **Courses** — search and store courses with tee data (rating, slope, par, hole distances)
- **Tournaments** — create and manage multi-round tournaments
- **Leaderboards & stats** — charts and standings across rounds and tournaments
- **Social** — friends, round comments, and likes
- **Auth** — email/password login with password reset via email

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL via Prisma 7 |
| Auth | NextAuth v5 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Animation | Framer Motion |
| Validation | Zod |

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

3. Run database migrations:

```bash
npx prisma migrate dev
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See [.env.example](.env.example) for all required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — random 32-character secret for session signing
- `NEXTAUTH_URL` — base URL of the app (e.g. `http://localhost:3000`)
- `GOLF_COURSE_API_KEY` — API key for the Golf Course API
- `GOLF_COURSE_API_BASE_URL` — Golf Course API base URL
- `SMTP_*` — SMTP credentials for password reset emails

## Project Structure

```
app/
  (app)/          # Authenticated routes (dashboard, rounds, courses, etc.)
  (auth)/         # Auth routes (login, register, reset-password)
  actions/        # Server actions
  api/            # API route handlers
components/
  charts/         # Recharts chart components
  leaderboard/    # Leaderboard UI
  scorecard/      # Scorecard entry UI
  ui/             # Shared UI components
lib/
  auth.ts         # NextAuth config
  courseApi.ts    # Golf Course API client
  handicap.ts     # Handicap calculation logic
  prisma.ts       # Prisma client instance
prisma/
  schema.prisma   # Database schema
```
