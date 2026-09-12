# PackrOn

AI travel planner for **road trips** and **city trips**. Fill in a short wizard, Gemini returns a full itinerary (stops, times, map coordinates, lodging, fuel/tolls), then you edit, save, and share it.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind 4 + shadcn (`base-nova`)
- Leaflet maps (`leaflet` + `react-leaflet`)
- Google Gemini (`@google/genai`, primary `gemini-3.1-flash-lite` with automatic fallback)
- Supabase Auth + Postgres (`@supabase/ssr` + `@supabase/supabase-js`) — login, saved trips, passkeys
- Italian and English via URL prefixes (`/it`, `/en`)
- Light/dark theme (cookie-persisted, OS-seeded on first visit)

## Features

- **Road trips**: multi-stop driving itineraries with distances, fuel costs, tolls, overnight stays. Optional "visit origin" toggle includes sightseeing in the origin city.
- **City trips**: walkable/public-transport itineraries within a single city.
- **Editable results**: reorder/remove stops (distances recompute live), replace a stop from 3 Gemini alternatives with undo toast + pinnable previous choice.
- **Lazy stop details**: on-demand description (Gemini) + real photo (Wikipedia, freely licensed) in a modal.
- **Sharing**: short links (`/{locale}/i/{id}`) stored server-side, with gzipped-URL fallback when storage is unavailable.
- **Accounts & saved trips**: email/password auth, passkeys (WebAuthn), username profile, saved-trip library with edit-overwrite, account deletion.
- **SEO**: locale sitemap with hreflang, canonical URLs, Open Graph/Twitter cards, JSON-LD, robots rules.

## Local setup

```bash
npm install
cp .env.example .env.local
# set GEMINI_API_KEY + Supabase vars (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Middleware redirects `/` to `/it` or `/en` from the `packron-locale` cookie or `Accept-Language`.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |

### Environment

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Yes, for generation | Also used for stop alternatives + descriptions |
| `GEMINI_MODEL` | No | Default `gemini-3.1-flash-lite` (fallback is built-in) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes, for auth/saved trips | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes, for auth/saved trips | Public `sb_publishable_…` key (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` still works as fallback). Never add a secret/service-role key |
| `NEXT_PUBLIC_SITE_URL` | Required in prod | Canonical URL; used for email-confirmation redirects, sitemap, canonical/OG tags |
| `NEXT_PUBLIC_BOOKING_AFFILIATE_ID` | No | Omitted from Booking URLs until set to a real aid |
| `NEXT_PUBLIC_GETYOURGUIDE_PARTNER_ID` | No | Optional `partner_id` on GetYourGuide searches |
| `PACKRON_SHARE_DIR` | No | Directory for short share IDs (default `.data/shares` locally, `/tmp` on Vercel) |

Without the Supabase vars the app still builds and runs, but auth UI explains setup and trip saving returns 503.

### Supabase setup

1. Create a project, then run both migrations in the SQL editor (in order):
   - `supabase/migrations/20260911000000_create_saved_trips.sql` (table + RLS)
   - `supabase/migrations/20260912000000_delete_own_account.sql` (self-service account deletion)
2. Set `NEXT_PUBLIC_SUPABASE_URL` + key, and `NEXT_PUBLIC_SITE_URL` in prod.
3. Dashboard → Authentication → URL Configuration: Site URL = production URL; Redirect URLs must include `<prod>/auth/callback` (+ `http://localhost:3000/auth/callback` for dev).
4. Optional, for passkeys: Authentication → Passkeys → enable, RP display name `PackrOn`, RP ID = bare production domain. RP ID binds credentials, so localhost needs its own RP ID/project for testing.

## Routes

Pages (all under `/it` + `/en`):

- `/` — planner
- `/how-it-works` — how it works (legacy `/come-funziona` 302-redirects here)
- `/examples` — example itineraries (legacy `/esempi` 302-redirects here)
- `/login`, `/signup` — public auth entry points (in sitemap)
- `/trips`, `/trips/[id]` — private saved-trip library (never indexed)
- `/account` — private profile, passkeys, delete account (never indexed)
- `/i`, `/i/[id]` — shared itineraries (never indexed)

API:

- `POST /api/generate-trip` — Gemini itinerary (required-fields check only; feasibility via Gemini `impossible_trip` flag)
- `POST /api/suggest-stops` — three nearby alternatives (Gemini, mock fallback)
- `POST /api/describe-stop` — lazy description + Wikipedia photo
- `GET /api/reverse-geocode` — Nominatim, then BigDataCloud
- `POST /api/share`, `GET /api/share/:id` — short share links (file store)
- `GET /api/trips`, `POST /api/trips` — list / save (auth required)
- `GET /api/trips/[id]`, `PUT /api/trips/[id]`, `DELETE /api/trips/[id]` — read / overwrite / delete own trip
- `DELETE /api/account` — delete own account (confirmation by typing username)
- `GET /auth/callback` — Supabase PKCE code exchange (not locale-prefixed)

## Sharing vs saved trips

- **Sharing** is account-free: the UI stores the itinerary as a JSON file (`PACKRON_SHARE_DIR`, ephemeral `/tmp` on Vercel) and copies `/{locale}/i/{id}`. If storage fails, it falls back to a gzipped itinerary in the query string/hash (`/{locale}/i?d=…`).
- **Saved trips** require login: rows in the Supabase `saved_trips` table guarded by RLS (`auth.uid() = user_id`). The client never sends a user id; the server takes it from the session.

## Key files

- `lib/gemini.ts`, `lib/gemini-prompt.ts`, `lib/gemini-schema.ts` — model call + fallback, prompt rules, response schema
- `lib/geocode.ts`, `lib/geo.ts` — required-field check, haversine distances, live recompute
- `lib/trips.ts`, `lib/share*.ts` — saved-trip validation, share validation/store
- `lib/supabase/` — browser/server clients, session refresh
- `lib/i18n.ts` — all user-facing strings (`it`/`en`, `MessageKey` type-safe)
- `components/planner.tsx`, `components/result/` — wizard + editable result view
- `components/auth/`, `components/trips/` — login, account, saved-trip UI

Architecture decisions and rationale live in `AGENTS.md` (single source of truth for contributors).

`public/logo.png` is part of the repo (it may be hidden from some workspace scans by ignore rules).
