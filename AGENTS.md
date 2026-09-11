<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MANDATORY: Update AGENTS.md

**Every AI working on this project MUST update this file with all decisions and rationale after completing any task.** This file is the single source of truth for project architecture decisions. If you don't update it, the next AI (or human) will lose context and make mistakes. Do not wait to be asked — update it proactively.

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

### Form validation in wizard steps
- Validation errors for missing required fields shown in the first tab (step 0) when user clicks "Continue"
- **Road trip**: Validates `origin` and `destination` before advancing from step 0
- **City trip**: Validates `city` before advancing from step 0
- Errors displayed in red using existing `text-destructive` styling
- i18n keys: `originRequired`, `destinationRequired`, `cityRequired` (both locales)
- Rationale: Immediate inline feedback prevents users from reaching generation with invalid data; keeps them in context of the problematic field

### Stop descriptions (lazy-loaded)
- "Description" button added alongside "Open in Google Maps", "Experiences", etc. in `StopCard`
- Description fetched on-demand from new `/api/describe-stop` endpoint when button clicked
- New `lib/gemini-describe-stop.ts` with dedicated schema and prompt for detailed place descriptions
- Modal dialog shows full description; cached after first fetch per stop
- Rationale: Pre-generating descriptions for all stops would be expensive in tokens; lazy loading defers cost to user interest

## Key Files

### `lib/geocode.ts`
- **`geocodeLocation`**: Forward geocoding via Nominatim (OpenStreetMap) - queries OSM with a location name and returns `lat`/`lng` or `null`
- **`validateLocations`**: **Now actually geocodes** origin/destination/city via `geocodeLocation` before calling Gemini. Returns specific error keys (`apiInvalidOrigin`, `apiInvalidDestination`, `apiInvalidCity`) when locations can't be found, and `apiTooFar` when the distance exceeds ~5000 km. Includes `coords` with latitude/longitude for downstream use.
- Returns structured coords for distance checks

### `lib/geo.ts`
- `haversineKm`: Great-circle distance between two `Stop` points (×1.35 road factor)
- `haversineKmCoords`: Great-circle distance between two plain `{lat, lng}` coordinate pairs (for `validateLocations`)
- `intraDayKm`: Sum of distances between consecutive stops in a day (×1.35 road factor)
- `originToFirstStopKm`: Distance from origin to first stop
- `withLiveDistances`: Recomputes day distances dynamically when stops reordered/removed

### Gemini API (`lib/gemini.ts`)
- Calls `ai.models.generateContent()` with `responseMimeType: "application/json"` **plus `responseSchema`** (restored). Rationale: dropping the schema broke valid trips — without enforcement Gemini returned a wrong shape (`itinerary` instead of `days`, missing `lat`/`lng`, wrong stop `type` enum), causing `apiBadSchema` 500s on good requests. The schema keeps valid output well-formed (coordinates, enums, required fields).
- The schema (`GEMINI_TRIP_SCHEMA`) carries **optional `impossible_trip: boolean` + `reason: string`** fields on top of the required trip fields. For impossible trips Gemini sets the flag, explains in `reason`, and fills remaining required fields with minimal values (empty `days`). The route checks the flag **before** `isGeminiTrip()`, and `isGeminiTrip()` explicitly rejects anything with `impossible_trip === true`, so the flagged payload can never render as a trip.
- Has automatic fallback from primary to fallback model

### `lib/gemini-prompt.ts`
- Added "Impossible trip detection" rules for Gemini
- AI returns `{"impossible_trip": true, "reason": "..."}` for invalid trips
- Handles: intercontinental, ocean crossings, >5000km, ungeocodable locations
- **Prompt reordering**: Impossible trip detection and location validation instructions are placed at the very top of the prompt (before any trip generation rules), ensuring Gemini prioritizes these checks over trip generation

### `lib/gemini-describe-stop.ts`
- Dedicated schema and prompt for generating detailed stop descriptions
- Returns `{"description": "..."}` with 3-5 sentence engaging descriptions
- Includes historical/cultural context, what makes it special, practical tips

### `app/api/generate-trip/route.ts`
- Calls `validateLocations` (geocode) first
- Checks 5000km threshold as fast path
- Calls Gemini; handles `impossible_trip` response
- Returns localized error messages

### `app/api/describe-stop/route.ts`
- Accepts stop data and locale, returns detailed description
- Falls back gracefully if Gemini unavailable

### `components/result/timeline.tsx`
- Shows `Footprints` icon (walking) for day distance < 15km
- Shows `Car` icon for ≥ 15km
- Rationale: Short distances in road trips often mean city exploration, not driving

### `components/result/itinerary-map.tsx`
- Accepts optional `origin: OriginPoint` prop
- Renders origin marker + line to first stop
- Validates coords before rendering (NaN checks)

### `components/result/stop-card.tsx`
- Added "Description" button with lazy-loaded modal
- Fetches from `/api/describe-stop` on demand
- Caches description after first fetch

## i18n
- All user-facing strings in `lib/i18n.ts` under `messages.it` / `messages.en`
- `MessageKey` type ensures compile-time safety
- New keys must be added to both locales

## Testing
- Mock itineraries in `lib/mock-itinerary.ts` include `originLat`/`originLng`
- Build with `npm run build` (includes TypeScript check)
- No test framework configured; manual verification via dev server

## Dark Mode

### Implementation
- **ThemeProvider** (`components/theme-provider.tsx`): React context managing theme state with three modes — `light`, `dark`, `system`
- **Persisted preference**: Stored in `localStorage` (`packron-theme` key), survives page reloads
- **System mode**: Respects `prefers-color-scheme` media query, auto-updates on OS theme change
- **Providers integration**: ThemeProvider wraps LocaleProvider in `components/providers.tsx`
- **Toggle UI** (`components/theme-toggle.tsx`): Segmented control with Sun/Moon/Monitor icons, accessible labels via i18n

### CSS Strategy
- Uses Tailwind v4 + `tw-animate-css` with CSS custom properties defined in `app/globals.css`
- Light/dark color schemes defined via `:root` and `.dark` selector (lines 53–162)
- `color-scheme` meta tag set on `:root` and `.dark` for proper form control styling
- Dark mode body background uses custom radial gradients matching brand palette (not pure black)
- Hero stage and Leaflet map containers have dark-specific overrides

### SSR Compatibility
- Initial render defaults to `light` to avoid hydration mismatch
- `resolveTheme()` guards `window.matchMedia` with `typeof window === "undefined"` check
- Theme applied via `useEffect` on client — no flash of wrong theme on first load
- Root `<html>` class updated dynamically (`light`/`dark`) via ThemeProvider effect

### i18n Keys Added
- `themeAria`, `themeLight`, `themeDark`, `themeSystem` in both Italian and English

### Rationale
- Three-mode toggle (not just light/dark) gives users full control while defaulting to system preference
- CSS custom properties avoid Tailwind's `dark:` variant limitations with custom design tokens
- SSR-safe pattern prevents hydration errors in Next.js App Router
- Theme toggle in header next to language switcher follows standard UI conventions