<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Decisions & Rationale

## Architecture

### Two-layer trip validation
- **Client-side (fast)**: Nominatim geocoding + 5000km threshold — instant feedback for obvious errors
- **Server-side (smart)**: Gemini evaluates trip feasibility with context — handles edge cases like ferries, specific routes, regional connectivity
- Rationale: Hardcoded thresholds alone are too rigid; AI can make nuanced decisions (e.g., Italy-Sicily ferry is fine, but Rome-Tokyo isn't)

### Itinerary types
- **Road trip**: Multi-stop driving itineraries with distances, fuel costs, tolls, overnight stays
- **City trip**: Walkable/public-transport itineraries within a single city, zero distance calculations
- Shared `Itinerary` type with `mode: "road" | "city"` discriminator

## Data Flow

### Origin point on map
- Added `originLat`/`originLng` to `Itinerary` type (from Gemini `origin_lat`/`origin_lng`)
- Map renders origin marker (🏠) + polyline from origin → first stop
- Distance calculation includes origin→first stop for day 1 (`withLiveDistances` in `lib/geo.ts`)
- Rationale: User sees the full route from their actual starting point, not just between stops

### Error handling with explanations
- `ErrorExplanation` component in `components/planner.tsx` shows contextual tips per error type
- i18n keys for: impossible trip, invalid origin/destination/city, too far
- Each error has explanation + 3 actionable tips
- Rationale: Raw error messages like "I couldn't generate" are useless; users need to know *why* and *what to do*

## Key Files

### `lib/geocode.ts`
- Forward geocoding via Nominatim (OpenStreetMap)
- Validates origin/destination/city exist before calling Gemini
- Returns structured coords for distance checks

### `lib/geo.ts`
- `haversineKm`: Great-circle distance between two points
- `intraDayKm`: Sum of distances between consecutive stops in a day (×1.35 road factor)
- `originToFirstStopKm`: Distance from origin to first stop
- `withLiveDistances`: Recomputes day distances dynamically when stops reordered/removed

### `lib/gemini-prompt.ts`
- Added "Impossible trip detection" rules for Gemini
- AI returns `{"impossible_trip": true, "reason": "..."}` for invalid trips
- Handles: intercontinental, ocean crossings, >5000km, ungeocodable locations

### `app/api/generate-trip/route.ts`
- Calls `validateLocations` (geocode) first
- Checks 5000km threshold as fast path
- Calls Gemini; handles `impossible_trip` response
- Returns localized error messages

### `components/result/timeline.tsx`
- Shows `Footprints` icon (walking) for day distance < 15km
- Shows `Car` icon for ≥ 15km
- Rationale: Short distances in road trips often mean city exploration, not driving

### `components/result/itinerary-map.tsx`
- Accepts optional `origin: OriginPoint` prop
- Renders origin marker + line to first stop
- Validates coords before rendering (NaN checks)

## i18n
- All user-facing strings in `lib/i18n.ts` under `messages.it` / `messages.en`
- `MessageKey` type ensures compile-time safety
- New keys must be added to both locales

## Testing
- Mock itineraries in `lib/mock-itinerary.ts` include `originLat`/`originLng`
- Build with `npm run build` (includes TypeScript check)
- No test framework configured; manual verification via dev server