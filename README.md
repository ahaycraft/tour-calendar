# Tour Calendar

A calendar app for touring bands to manage shows and member availability.

## Features

- **Calendar view** — see all upcoming shows and your personal unavailable days at a glance
- **Shows management** — add shows with venue, date, load-in/doors/set times, guarantee, and notes
- **Show availability** — mark yourself available/unavailable per show with an optional note
- **Show status** — admins can confirm, cancel, or delete shows
- **Personal unavailability** — block off days you can't play (click any date on the calendar, or use the My Availability page)
- **Band member overview** — see who's in/out for each show

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** via any provider (Neon, Supabase, Railway, etc.)
- **Prisma 6** ORM
- **NextAuth v5** (credentials-based auth, JWT sessions)
- **FullCalendar v6** for the calendar UI
- **Tailwind CSS v4**

## Setup

### 1. Get a PostgreSQL database

Get a free database from [Neon](https://neon.tech) or [Supabase](https://supabase.com).

### 2. Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL with your connection string
# Generate a secret: openssl rand -base64 32
# Set NEXTAUTH_SECRET to the generated value
```

### 3. Initialize database and run

```bash
npm install
npm run db:push        # push schema to database
npm run db:seed        # (optional) seed demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo credentials** (after seeding):
- Admin: `admin@band.com` / `password123`
- Members: `guitarist@band.com` or `drummer@band.com` / `password123`

## Database Commands

```bash
npm run db:push      # Push schema changes without migration files
npm run db:migrate   # Create and run a named migration
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio (visual DB browser)
```

## Roles

- **ADMIN** — can confirm/cancel/delete shows
- **MEMBER** — can add shows, respond to availability, manage blocked dates

First user is MEMBER. To make someone an admin, update their `role` in Prisma Studio (`npm run db:studio`) or directly in the database.

## Schema

```
User                 — band members
Show                 — gig details (venue, date, times, guarantee, notes)
ShowAvailability     — per-user per-show response (AVAILABLE/UNAVAILABLE/PENDING)
MemberUnavailability — personal blocked dates
```
