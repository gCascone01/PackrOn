# PackrOn

AI travel planner for **road trips** and **city trips**. Fill in a short wizard, Gemini returns a full itinerary (stops, times, map coordinates, lodging, fuel/tolls), then you edit and share it.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind 4 + shadcn (`base-nova`)
- Leaflet maps
- Google Gemini (`@google/genai`)
- Italian and English via URL prefixes (`/it`, `/en`)

## Local setup

```bash
npm install
cp .env.example .env.local
# set GEMINI_API_KEY
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
| `GEMINI_API_KEY` | Yes, for generation | Also used for live stop alternatives |
| `GEMINI_MODEL` | No | Default `gemini-3.1-flash-lite` |
| `NEXT_PUBLIC_BOOKING_AFFILIATE_ID` | No | Omitted from Booking URLs until set to a real aid |
| `NEXT_PUBLIC_GETYOURGUIDE_PARTNER_ID` | No | Optional `partner_id` on GetYourGuide searches |
| `PACKRON_SHARE_DIR` | No | Directory for short share IDs |

## Routes

- `/it` and `/en` — planner
- `/it/come-funziona`, `/en/come-funziona` — how it works
- `/it/esempi`, `/en/esempi` — example itineraries
- `POST /api/generate-trip` — Gemini itinerary
- `POST /api/suggest-stops` — three nearby alternatives (Gemini, mock fallback)
- `GET /api/reverse-geocode` — Nominatim, then BigDataCloud
- `POST /api/share` and `GET /api/share/:id` — short share links

## Sharing

The UI first stores the itinerary as a JSON file and copies `/{locale}/i/{id}`.

- Locally that lives under `.data/shares`
- On Vercel the default is `/tmp/packron-shares` (ephemeral across instances)

If storage fails, PackrOn falls back to a gzipped itinerary in the query string or hash (`/{locale}/i?d=…`). There is no user account or database.

## Out of scope

There is still **no authentication**. The planner is a client session plus optional share files; adding accounts would need a real store and is left for a later pass.

`public/logo.png` is part of the repo (it may be hidden from some workspace scans by ignore rules).
