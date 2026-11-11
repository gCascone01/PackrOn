# PackrOn

PackrOn is an AI-powered trip planner for road trips and city trips. It creates editable itineraries with places to visit, maps, and estimated travel costs.

## Features

- Plan multi-stop road trips or city itineraries.
- Generate and edit itineraries with AI, including stop alternatives and place descriptions.
- View routes on a map and estimate fuel, toll, and trip costs.
- Save trips to an account, share public links, and revisit saved trips.
- Export itineraries as printable PDFs.
- Use the app in English or Italian, with light and dark themes.

## Tech stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS and Leaflet
- Google Gemini for itinerary generation
- Supabase Auth and Postgres for accounts and saved trips
- Vitest for tests

## Getting started

You need Node.js and npm installed.

```bash
npm install
cp .env.example .env.local
```

Add your Gemini and Supabase credentials to `.env.local`, then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to the Italian or English version based on your browser language or saved locale preference.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Generates itineraries, stop alternatives, and descriptions |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public Supabase key; the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported |
| `NEXT_PUBLIC_SITE_URL` | Production | Public site URL used for canonical links and social metadata |
| `GEMINI_MODEL` | No | Overrides the default Gemini model |
| `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` | No | Enables CARTO map tiles; OpenStreetMap is used without it |
| `NEXT_PUBLIC_BOOKING_AFFILIATE_ID` | No | Adds an affiliate ID to Booking.com links |
| `NEXT_PUBLIC_GETYOURGUIDE_PARTNER_ID` | No | Adds a partner ID to GetYourGuide links |

Supabase is required for trip generation and storage. Never put a Supabase secret or service-role key in the app.

### Supabase setup

Run these migrations in order in the Supabase SQL editor:

1. `supabase/migrations/20260911000000_create_saved_trips.sql`
2. `supabase/migrations/20260912000000_delete_own_account.sql`
3. `supabase/migrations/20261002000000_unify_trip_storage.sql`
4. `supabase/migrations/20261005000000_trip_favorites.sql`

Disable email confirmation in the Supabase Auth settings so signup creates a session immediately. Passkeys are optional and require enabling them in the Supabase dashboard.

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run the test suite |

## Main routes

All pages are available under `/en` and `/it`.

- `/` — trip planner
- `/how-it-works` — product guide
- `/examples` — example itineraries
- `/login` and `/signup` — account access
- `/trips` and `/trips/[id]` — saved trips
- `/trip/[id]` — public trip page
- `/account` — profile and account settings

The legacy `/i/[id]` trip URL redirects to `/trip/[id]`.

## Project structure

- `app/` — pages, API routes, and metadata
- `components/` — planner, trip results, account, and shared UI
- `hooks/` — React hooks
- `lib/` — itinerary logic, integrations, and shared utilities
- `supabase/migrations/` — database migrations
- `public/` — logos, icons, and social images

See [AGENTS.md](./AGENTS.md) for architecture decisions and implementation notes.
