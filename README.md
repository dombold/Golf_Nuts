# Golf Nuts

A full-stack golf scoring and social web app built with Next.js 16, Prisma 7, and PostgreSQL.

## Features

- **Round tracking** — log rounds across multiple game formats: Strokeplay, Stableford, Match Play, Skins, Ambrose (2/4 player)
- **Scorecards** — per-hole scoring with strokes, penalties, putts, fairways hit, and GIR
- **Handicap system** — automatic handicap index tracking and history
- **Courses** — search and import courses via the Golf Course API, with full tee data (rating, slope, par, hole distances)
- **Tournaments** — create and manage multi-round tournaments with groups, invitations, and leaderboards
- **Stats & charts** — visualise performance trends across rounds and tournaments
- **Social** — friends, round comments, and likes
- **Auth** — email/password login with password reset via email
- **PWA** — installable as a Progressive Web App with service worker support

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
| Email | Nodemailer |

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

4. (Optional) Seed with Western Australia golf courses:

```bash
npx prisma db seed
```

5. Start the development server:

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
- `GOOGLE_MAPS_API_KEY` — Google Maps API key (server-side only)
- `SMTP_*` — SMTP credentials for password reset emails

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
  scorecard/      # Scorecard entry UI
  tournament/     # Tournament UI
  ui/             # Shared UI components
data/             # Static JSON data (courses)
lib/
  auth.ts         # NextAuth config
  courseApi.ts    # Golf Course API client
  handicap.ts     # Handicap calculation logic
  prisma.ts       # Prisma client instance
prisma/
  schema.prisma   # Database schema
  seed.ts         # Database seeding script
types/            # TypeScript type definitions
proxy.ts          # Next.js 16 route protection (replaces middleware.ts)
```

## Notes

This project uses **Next.js 16** and **Prisma 7**, both of which have breaking changes from their previous major versions:

- Next.js 16 uses `proxy.ts` instead of `middleware.ts` for route protection
- Prisma 7 requires `@prisma/adapter-pg` — no `url` in schema datasource; client is imported from `@/app/generated/prisma/client`
