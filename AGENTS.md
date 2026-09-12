<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MANDATORY: Update AGENTS.md

**Every AI working on this project MUST update this file with all decisions and rationale after completing any task.** This file is the single source of truth for project architecture decisions. If you don't update it, the next AI (or human) will lose context and make mistakes. Do not wait to be asked — update it proactively.

# Project Decisions & Rationale

## Architecture

### Trip validation (Gemini-only)
- **Client-side (fast)**: Required field validation only (origin/destination for road trips, city for city trips) — instant feedback for missing fields
- **Server-side (smart)**: Gemini evaluates trip feasibility with context — handles location existence, edge cases like ferries, specific routes, regional connectivity, intercontinental/ocean crossings. Gemini imposes **no distance limit**; the ~10000km cap is enforced client-side only (`validateLocations` fast path in `lib/geocode.ts`)
- Rationale: Nominatim geocoding was rigid and couldn't handle fuzzy locations (e.g., "Tuscany" vs specific city); Gemini can interpret natural language locations and make nuanced feasibility decisions (e.g., Italy-Sicily ferry is fine, but Rome-Tokyo isn't)

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
- Category matching is **case-insensitive** (`error.toLowerCase()`): Gemini reasons are free text with unpredictable capitalization (e.g. "City 'Xyz' not found" never contained lowercase "city", so the old case-sensitive match missed every Gemini error)
- Italian "Origine '…'" is matched via an explicit `origine` keyword (neither `origin` nor `partenza` covers it)
- `isTooFar` is checked **before** origin/destination: the apiTooFar message itself mentions "origin and destination" and would otherwise match the wrong category
- Unknown errors render **title only** — the old fallback re-rendered the same `error` string as the body, which is why title and description were often identical
- Non-JSON API responses (e.g. a platform HTML timeout page on very long generations) are caught client-side via a content-type check + `res.json()` try/catch and surfaced as the localized `apiUnexpected` message — never a raw `Unexpected token '<'` SyntaxError
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

### Back preserves inputs, Restart resets (form state lifted to Planner)
- `RoadTripConfigurator` / `CityTripConfigurator` are fully controlled: `value: RoadFormValue/CityFormValue`, `onChange`, `step`, `onStepChange`
- `Planner` owns `roadForm`, `cityForm`, `roadStep`, `cityStep`, `mode` — configurators no longer `useState` form fields, so unmounting on result view does not lose data
- Back arrow (`onBack`/`goBack` in `Planner`, brand click) only clears `result` — all inputs + per-mode wizard steps survive for every tab
- New Restart button (`RotateCcw` + i18n `restart`: "Ricomincia"/"Restart") in `ResultView` header next to Share calls `restart()` in `Planner`: resets both forms to `DEFAULT_*`, steps to 0, mode to "road", clears error/result
- `ResultView` prop `onRestart?` is optional — examples/shared pages omit it so no restart button renders there (no form to reset)
- Switching road/city via `ModeSelector` only sets mode, preserving the other mode's form + step (restores where user left off)
- Rationale: back = "tweak and regenerate", restart = explicit "start over"; previously both were conflated and back wiped everything because state lived in unmounted children

### Stop descriptions (lazy-loaded)
- "Description" button added alongside "Open in Google Maps", "Experiences", etc. in `StopCard`
- Description fetched on-demand from new `/api/describe-stop` endpoint when button clicked
- New `lib/gemini-describe-stop.ts` with dedicated schema and prompt for detailed place descriptions
- Modal dialog shows full description; cached after first fetch per stop
- Rationale: Pre-generating descriptions for all stops would be expensive in tokens; lazy loading defers cost to user interest

## Key Files

### `lib/geocode.ts`
- Forward geocoding via Nominatim (OpenStreetMap) — **no longer used for validation**
- `validateLocations` now only checks required fields exist (no geocoding)

### `lib/geo.ts`
- `haversineKm`: Great-circle distance between two `Stop` points (×1.35 road factor)
- `haversineKmCoords`: Great-circle distance between two plain `{lat, lng}` coordinate pairs (for `validateLocations`)
- `intraDayKm`: Sum of distances between consecutive stops in a day (×1.35 road factor)
- `originToFirstStopKm`: Distance from origin to first stop
- `withLiveDistances`: Recomputes day distances dynamically when stops reordered/removed

### Gemini API (`lib/gemini.ts`)
- Calls `ai.models.generateContent()` with `responseMimeType: "application/json"` **plus `responseSchema`** (restored). Rationale: dropping the schema broke valid trips — without enforcement Gemini returned a wrong shape (`itinerary` instead of `days`, missing `lat`/`lng`, wrong stop `type` enum), causing `apiBadSchema` 500s on good requests. The schema keeps valid output well-formed (coordinates, enums, required fields).
- The schema (`GEMINI_TRIP_SCHEMA`) carries **optional `impossible_trip: boolean` + `reason: string`** fields on top of the required trip fields. For impossible trips Gemini sets the flag, explains in `reason`, and fills remaining required fields with minimal values (empty `days`). The `impossible_trip` description instructs best-effort name interpretation (tolerate typos/transliterations/alt names) so only true gibberish/fictional places are flagged. The route checks the flag **before** `isGeminiTrip()`, and `isGeminiTrip()` explicitly rejects anything with `impossible_trip === true`, so the flagged payload can never render as a trip.
- Has automatic fallback from primary to fallback model

### `lib/gemini-prompt.ts`
- Road trips carry a `visitOrigin` flag (toggle in step 0 under destination, defaults off): when on, Gemini includes sightseeing stops in the origin city (e.g. day 1) before departing; when off, the origin is departure-only with no sightseeing stops there
- Day-count integrity: both modes require exactly N entries in `days` (one per trip day, never fewer) with at least 3 stops per day — without this, long trips under output-token pressure collapse into 1–2 sample days (~6-7 stops total). The 5-7/day target still governs short trips
- "Impossible trip detection" is **permissive on names, strict on feasibility**: Gemini must auto-correct obvious typos, missing/extra/swapped letters, missing accents/diacritics, transliterations, and alternative-language names (e.g. "Seville" = "Siviglia", "Rmoa" = "Roma") and plan the trip for the corrected place — for city-trip cities and road-trip origin/destination alike
- `impossible_trip: true` only after best-effort interpretation clearly yields no real visitable place (gibberish like "Xyzq", fictional places, empty/non-place input); never for a minor misspelling
- **Generous durations are valid**: extra days vs. distance mean detours, rest days, deeper exploration — pace is a daily maximum, not a quota (a 30-day trip for ~2500 km must be planned, not refused)
- "Impossible trip detection" feasibility rules: refuse for geography only when a flight is truly unavoidable (no drivable land connection AND no ferry link — e.g. Europe–America, Europe–Australia). **No kilometer limit on Gemini's side**: distance is gated client-side (`validateLocations` rejects only when both ends geocode >10000km apart; `error_code: "too_far"` is reserved for that client-side check and Gemini must never set it for distance). Ferry seas are road-trip territory: the Mediterranean is explicitly crossable (Italy–Greece / Italy–Tunisia ferries, or overland via Balkans–Turkey — Milan–Cairo is valid), with ferry legs and border/visa warnings stated in the itinerary
- Border/visa/geopolitical complexity and "extensive distance" / "typical parameters" are **never refusal reasons**: Gemini must plan the route and surface crossing requirements as in-itinerary warnings instead
- AI returns `{"impossible_trip": true, "error_code": "...", "reason": "..."}` for invalid trips — `error_code` is a machine-readable category (`invalid_city` | `invalid_origin` | `invalid_destination` | `too_far` | `impossible`) so the API can return a stable localized message instead of relying on free-text keyword matching

### `lib/gemini-schema.ts`
- Added required `origin_lat` and `origin_lng` fields to schema

### `app/api/generate-trip/route.ts`
- Validates required fields only
- `validateLocations` fast-path rejects only confidently impossible trips (both ends geocoded >10000km apart); otherwise Gemini decides via the `impossible_trip` flag
- Handles `impossible_trip` response from Gemini: maps `error_code` to a stable localized message (`apiInvalidCity`/`apiInvalidOrigin`/`apiInvalidDestination`/`apiTooFar`/`apiImpossibleTrip`) and appends Gemini's `reason` as detail; falls back to the raw reason when `error_code` is missing
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

## SEO (`app/sitemap.ts`, `app/robots.ts`)
- Sitemap lists the 6 canonical locale URLs: `/{en,it}`, `/{en,it}/how-it-works`, `/{en,it}/examples` — derived from `LOCALES` in `lib/i18n.ts`
- Legacy slugs `/come-funziona` and `/esempi` are NOT in the sitemap (they 302-redirect in `proxy.ts`); listing redirecting URLs hurts SEO
- Dynamic/shared routes (`/[locale]/i`, `/[locale]/i/[id]`) excluded — no indexable content; also disallowed in `robots.ts` alongside `/api/`
- Base URL from `NEXT_PUBLIC_SITE_URL` env with fallback to `https://packron.vercel.app` — set the env var when the production domain changes instead of editing code
- Rationale: sitemap must match the real `[locale]` route structure, not the pre-i18n slugs
- Every sitemap URL carries `alternates.languages` (`en`/`it`/`x-default`, absolute URLs) → Next renders `<xhtml:link hreflang>` entries, mirroring the hreflang link tags in metadata so Google serves the right locale

## Favicons & social metadata (`app/layout.tsx`, `app/[locale]/layout.tsx`, `app/manifest.ts`)
- All raster assets are generated from `public/logo.png` (the real brand mark — 2000×2000, transparent corners). The v0 placeholders in `public/` (`icon.svg`, `icon-light/dark-32x32.png`, `apple-icon.png`, `placeholder-*`) are unreferenced leftovers; do not point metadata at them
- Generated assets in `public/`: `favicon.ico` (multi-size 16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180, flattened on white — iOS renders transparency as black), `android-chrome-192x192.png` + `android-chrome-512x512.png` (transparency kept), `og-image.png` (1200×630, logo centered on white). Regenerate from `logo.png` with PIL if the brand mark changes
- Root `app/layout.tsx` holds the full `metadata`: `metadataBase` (same SITE_URL env/fallback as sitemap), title template `%s | PackrOn`, keywords, authors/creator/publisher, canonical + `hreflang` (`en`/`it`/`x-default`), Open Graph (website, `en_US` + `it_IT` alternate, absolute `og-image` URL), Twitter `summary_large_image`, robots incl. `max-image-preview:large`, icons (`.ico` + PNG sizes + Apple), `manifest: /manifest.webmanifest`, `appleWebApp`, `msapplication-TileColor`
- `app/[locale]/layout.tsx` `generateMetadata()` returns **complete** `openGraph`/`twitter` objects per locale (localized title/description/canonical/`og:locale`, alternate swapped). Rationale: Next.js merges `openGraph`/`twitter` shallowly — a partial child object silently wipes the parent's `images`/`siteName`/`type` (verified: first version rendered no `og:image` and `twitter:card=summary`)
- JSON-LD (`Organization` + `WebSite` + `WebApplication/TravelApplication`) injected via script tag in root layout body
- `Organization.sameAs` lists official social profiles (currently Instagram `packron.app`) — this is how Google discovers them for search-result profile links; append X/Facebook/etc. handles there when created
- `app/manifest.ts` serves `/manifest.webmanifest` (standalone, white theme/bg, 192/512/180 icons). Google Search Console verification stays file-based (`public/google*.html`); no `verification` metadata field needed
- Rationale: previously the favicon was the 1.6MB `logo.png` itself and no OG/Twitter/canonical/hreflang tags existed, so link unfurls and Google indexing were both broken

## Dark Mode

### Implementation
- **ThemeProvider** (`components/theme-provider.tsx`): React context managing theme state with two modes — `light`, `dark` (no `system` mode)
- **Persisted preference**: Stored in a `packron-theme` cookie (`Path=/`, 1-year `Max-Age`, `SameSite=Lax`), survives page reloads
- **First-visit init**: With no cookie yet, the theme is resolved once from the OS `prefers-color-scheme` media query and persisted to the cookie immediately; a legacy `localStorage` value (including the old `"system"`) is migrated once, then removed
- **Providers integration**: ThemeProvider wraps LocaleProvider in `components/providers.tsx`
- **Toggle UI** (`components/theme-toggle.tsx`): Segmented control with Sun/Moon icons only, accessible labels via i18n

### CSS Strategy
- Uses Tailwind v4 + `tw-animate-css` with CSS custom properties defined in `app/globals.css`
- Light/dark color schemes defined via `:root` and `.dark` selector (lines 53–162)
- `color-scheme` meta tag set on `:root` and `.dark` for proper form control styling
- Dark mode mirrors light palette (blue-slate hue ~238 + brand blue 224 + orange accent 38) — NOT neutral gray; bg `0.26`, card `0.315`, lighter than before for readability
- Dark contrast: foreground `0.93`, muted-foreground `0.78` (was `0.708` — too dim); primary/accent keep light-theme hues lightened (`0.72`/`0.74`) with dark text for button contrast
- Dark mode body background uses custom radial gradients matching brand palette (not pure black)
- Hero stage and Leaflet map containers have dark-specific overrides
- `CategoryBadge` (`components/category-badge.tsx`) has `dark:` variants (`-400/20` bg + `-200` text) — light pastels (`-50` bg) are blinding/unreadable on dark without them

### SSR Compatibility
- Initial render defaults to `light` to avoid hydration mismatch
- Theme applied via `useEffect` on client — no flash of wrong theme on first load
- Root `<html>` class updated dynamically (`light`/`dark`) via ThemeProvider effect
- `suppressHydrationWarning` on BOTH `<html>` and `<body>` in `app/layout.tsx` — browser extensions (translator, password manager, Grammarly) inject attributes like `__processed_...="true"` into `<body>` before React loads; without suppression this triggers "A tree hydrated but some attributes..." error
- `ThemeProvider` state initializes to `"light"` unconditionally (no `typeof window` branch in `useState` initializer); real preference synced from the cookie in mount `useEffect` — avoids server/client initial-state divergence

### i18n Keys Added
- `themeAria`, `themeLight`, `themeDark` in both Italian and English (`themeSystem` removed with the system mode)

### Rationale
- Two-mode toggle (light/dark) keeps the header compact; the OS preference is only used once to seed the first visit, then the explicit choice is persisted in the cookie
- CSS custom properties avoid Tailwind's `dark:` variant limitations with custom design tokens
- SSR-safe pattern prevents hydration errors in Next.js App Router
- Theme toggle in header next to language switcher follows standard UI conventions

## Auth & Saved Trips (Supabase-native)

### Decision: no custom password/crypto code — Supabase Auth + RLS is the wheel
- **Auth**: Supabase Auth (GoTrue) via `@supabase/ssr` + `@supabase/supabase-js`. Passwords go over TLS straight to Supabase (bcrypt-hashed server-side); the app never sees, hashes, or stores passwords — so no `bcrypt`/`jose`/custom JWT code in this repo.
- **Sessions**: httpOnly (`sb-*-auth-token`), Secure in production, SameSite=Lax cookies managed by `@supabase/ssr`; PKCE flow; no tokens in localStorage (XSS-proof). `proxy.ts` calls `updateSession()` on every request to refresh cookies.
- **Encryption**: TLS 1.2+ in transit, AES-256 at rest (Supabase-managed). Only `NEXT_PUBLIC_SUPABASE_URL` + the public key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, with legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback via `getSupabasePublishableKey()`) are exposed (public by design — RLS enforces access). No secret/service-role key anywhere in the app.
- **Authorization**: `saved_trips` table with RLS `auth.uid() = user_id` on SELECT/INSERT/UPDATE/DELETE (`supabase/migrations/20260911000000_create_saved_trips.sql`). API routes (`app/api/trips/route.ts`, `app/api/trips/[id]/route.ts`) take `user_id` from the server-side session only — never from client input (prevents IDOR). Payloads re-validated server-side with `isItinerary()` + 500KB cap + 160-char title cap (`lib/trips.ts`, tested in `lib/trips.test.ts`).
- **Graceful pre-Supabase state**: until env vars are set, `isSupabaseConfigured()` / `AuthProvider.configured` degrade (auth UI explains setup, trip saving returns 503) while the rest of the app builds and runs. No dead imports, no crashes. Setup = create project → run migration → set the two env vars → enable email confirmation redirect to `/auth/callback`.
- **Confirmation redirect (2026-09)**: signup passes `emailRedirectTo` preferring `NEXT_PUBLIC_SITE_URL` (canonical production URL, required in prod) with `window.location.origin` fallback for local dev. Supabase ignores any `emailRedirectTo` not listed in Dashboard → Authentication → URL Configuration (Site URL + Redirect URLs) and falls back to the dashboard Site URL — which is why production emails pointed at `localhost:3000` while the dashboard Site URL was still the dev default. Dashboard fix: Site URL = production URL, Redirect URLs must include `<prod>/auth/callback` (+ localhost variant for dev). Emails sent before the fix keep the old link.
- Rationale: anything hand-rolled (password hashing, JWT issuance, session cookies, per-user DB filtering) would duplicate — and likely weaken — what Supabase already provides audited and maintained.

### Key files
- `lib/supabase/config.ts` — env helpers + `isSupabaseConfigured()`
- `lib/supabase/client.ts` — browser client (`createBrowserClient`) with `auth.experimental.passkey` opt-in (required for the passkey API)
- `lib/passkeys.ts` — `getPasskeyErrorCode()` + `isPasskeyCancelled()` shared helpers (tested in `lib/passkeys.test.ts`)
- `lib/supabase/server.ts` — server client (Route Handlers/Server Components, cookie-aware)
- `lib/supabase/middleware.ts` — `updateSession()` used by `proxy.ts`
- `lib/trips.ts` — `SavedTrip` types, `validateSaveTripPayload`, `toSavedTripSummary`
- `supabase/migrations/20260911000000_create_saved_trips.sql` — table + RLS + `updated_at` trigger
- `app/auth/callback/route.ts` — PKCE code exchange (not locale-prefixed)
- `app/api/trips/route.ts` — GET list (summaries), POST save (201 + `{id}`)
- `app/api/trips/[id]/route.ts` — GET one, PUT overwrite (re-saving an edited trip updates the same record, no duplicates), DELETE (401 logged-out / 404 foreign-or-missing, no existence leak)
- `components/auth/auth-provider.tsx` — session context (`AuthProvider` in `components/providers.tsx`)
- `components/auth/auth-form.tsx` — login/signup tabs, client validation (email regex, min 8 chars), friendly Supabase error mapping
- `components/auth/auth-dialog.tsx` — modal used by header/save button (Esc + backdrop close, focus-safe). Rendered via `createPortal` to `document.body`: callers live inside filtered ancestors (sticky blurred header) that would otherwise trap `position: fixed` and break viewport centering; `min-h-full` flex wrapper keeps it centered and scrollable on small screens.
- `components/auth/user-menu.tsx` — header: login button → dialog when logged out; email dropdown (My trips + logout) when logged in. On mobile (`<sm`) the trigger is a circular avatar with the username's uppercase first letter; `sm+` keeps the icon + full name.
- `components/auth/save-trip-button.tsx` — tristate: never-saved → POST; saved+unedited → checked "Saved", click confirms + DELETEs (view stays open, button back to unsaved); saved+edited (snapshot mismatch on any reorder/remove/replace) → unchecked, click PUTs over the same id (POST fallback on 404). `ResultView` takes `savedId`; `SavedTripView` passes the trip id, `key={tripId}` remount, and resets state on id change.
- `app/[locale]/login/page.tsx`, `app/[locale]/signup/page.tsx` — full-page auth (`components/auth/auth-page.tsx`)
- `app/[locale]/trips/page.tsx` + `components/trips/my-trips-page.tsx` — saved-trip grid with delete (confirm dialog)
- `app/[locale]/trips/[id]/page.tsx` + `components/trips/saved-trip-view.tsx` — reopen a saved itinerary in `ResultView`

### i18n keys added
- `authTitle`, `authSubtitle`, `authLogin`, `authSignup`, `authLoginAction`, `authSignupAction`, `authEmail`, `authPassword`, `authPasswordHint`, `authWorking`, `authClose`, `authInvalidEmail`, `authPasswordShort`, `authNotConfigured`, `authGenericError`, `authWrongCredentials`, `authAlreadyRegistered`, `authRateLimited`, `authEmailRateLimited`, `authCheckEmail`, `authSecurityNote`, `authLogout`, `authAccount`, `authMyTrips`, `authLoginRequired`, `tripSave`, `tripSaving`, `tripSaved`, `tripSaveFail`, `tripsTitle`, `tripsSubtitle`, `tripsEmpty`, `tripsEmptyAction`, `tripsOpen`, `tripsDelete`, `tripsDeleting`, `tripsDeleteFail`, `tripsLoadFail`, `tripsDeleteConfirm`, `tripsSignInPrompt`, `tripsSetupRequired`, `accountTitle`, `accountSubtitle`, `accountEmail`, `accountUsername`, `accountUsernameHint`, `accountNewPassword`, `accountNewPasswordHint`, `accountConfirmPassword`, `accountSave`, `accountSaving`, `accountSaved`, `accountSaveFail`, `accountPasswordMismatch`, `accountInvalidUsername`, `accountSetupRequired`, `authPasskeyOr`, `authPasskeyButton`, `authPasskeyWorking`, `authPasskeyUnavailable`, `authPasskeyUnsupported`, `authPasskeyNotFound`, `accountPasskeysTitle`, `accountPasskeysBody`, `accountPasskeyAdd`, `accountPasskeyAdding`, `accountPasskeyAdded`, `accountPasskeyRemoved`, `accountPasskeyEmpty`, `accountPasskeyRemove`, `accountPasskeyRemoving`, `accountPasskeyFail`, `accountPasskeyConfirmEmail`, `accountPasskeyExists`, `accountPasskeyRename`, `accountPasskeySave`, `accountPasskeyCancel`, `accountPasskeyRenamed` (both locales)
- Auth rate limits (2026-09): Supabase returns 429 for distinct limits — `over_email_send_rate_limit` (built-in provider: 2 emails/hour project-wide) vs generic IP/request limits. `AuthForm` inspects both `error.code` and message (old code only checked `message`, missing the code) and shows `authEmailRateLimited` vs `authRateLimited` (wait a minute). `authEmailRateLimited` copy stays end-user friendly ("too many signups, try again later") with no Supabase/SMTP detail — the 2/hour + custom-SMTP fix lives only in the code comment and here. Rationale: "wait a minute" is wrong for the email cap and users kept retrying, extending the block.

### Missing-table diagnosis (2026-09: live debug)
- Both "Couldn't load saved trips" and "Couldn't save the trip" traced to `PGRST205` — the `saved_trips` migration was never run in the Supabase project (verified via anon REST probe: table absent from schema cache).
- Fix: `lib/trips.ts#isMissingTableError()` detects PGRST205/42P01; routes return 503 `{error: "setup_required"}` + `console.error` server-side; UI maps it to `tripsSetupRequired` (tells the user to run the migration file in the SQL editor). Tested in `lib/trips.test.ts`. Actual data fix still requires running the migration once in the dashboard.

### SEO
- `/login`, `/signup` (all locales) ARE in `app/sitemap.ts` (priority 0.5, public auth entry points) and allowed in `app/robots.ts`.
- `/trips`, `/trips/[id]`, `/account` (all locales) + `/auth/*` + `/api/` + `/*/i/` are `disallow`ed in `app/robots.ts` and excluded from `app/sitemap.ts` — private/auth routes must never be indexed.

### Username & account page
- Username lives in Supabase Auth `user_metadata.username` (no extra table — avoids a second source of truth and extra RLS surface).
- `lib/username.ts`: `defaultUsername(email)` (prefix before `@`, sanitized to `[a-zA-Z0-9._-]`, ≤30 chars, `traveler` fallback), `isValidUsername()` (3–30 same charset), `displayName(user)` (stored → derived → email → "Account"). Tested in `lib/username.test.ts`.
- Signup (`auth-form.tsx`) seeds `options.data.username`; existing users without metadata get the derived fallback automatically.
- `app/[locale]/account/page.tsx` + `components/auth/account-page.tsx`: read-only email, editable username, optional new-password + confirm (min 8, match check), single `auth.updateUser()` call. Header `UserMenu` shows `displayName()` + links to Account and My trips.
- **Delete account**: danger zone at the bottom of the account page with an explicit cannot-be-undone notice; deletion requires typing the current username, then `DELETE /api/account` calls the `delete_own_account()` SECURITY DEFINER function (`supabase/migrations/20260912000000_delete_own_account.sql`, EXECUTE granted to `authenticated` only), which deletes only the caller's `auth.users` row (saved trips cascade). No service-role key used. Missing function (PGRST202) maps to distinct `account_setup_required` 503 (never the trips `setup_required`, which points at the wrong migration) so the UI shows `accountSetupRequired` with the delete-migration filename; the client also treats legacy `setup_required` as `accountSetupRequired` for backwards compat (2026-09 fix: delete failures previously showed the trips-table message).

### Passkeys (Supabase-native, beta)
- Supabase Auth beta passkeys (WebAuthn) via `supabase-js` high-level API (`auth.signInWithPasskey()`, `auth.registerPasskey()`, `auth.passkey.list()/delete()`) — no custom crypto, no extra tables, no service-role key; Supabase stores public keys and issues the session, same httpOnly-cookie flow as password login.
- Browser client opts in with `auth: { experimental: { passkey: true } }` (without it every passkey method throws; the experimental API may change without notice).
- Login: "Continue with passkey" button (`auth-form.tsx`, also inside `AuthDialog`) runs the discoverable-credential ceremony — no email needed upfront, the authenticator picks the account; success follows the same redirect as password login. The button only renders when `window.PublicKeyCredential` exists (enabled in a mount effect to avoid hydration mismatch); deliberately NOT gated on platform-authenticator availability so security-key / hybrid (phone QR) users keep it.
- Enrollment/management: passkeys section on the account page (`registerPasskey()` requires a signed-in, confirmed, non-anonymous user; list shows friendly name + creation date; per-item inline rename via `passkey.update()` + remove).
- Error mapping (`lib/passkeys.ts`): dismissed browser prompts (`NotAllowedError`/`AbortError`, incl. nested `cause` and `ERROR_CEREMONY_ABORTED`) stay silent; `passkey_disabled` → `authPasskeyUnavailable`, unsupported browser → `authPasskeyUnsupported`, no credential on device → `authPasskeyNotFound`, unconfirmed email on enroll → `accountPasskeyConfirmEmail`, already-registered authenticator → `accountPasskeyExists`. All user-facing copy stays end-user friendly (no Supabase detail).
- **Dashboard setup required**: Authentication → Passkeys → enable, RP display name "PackrOn", RP ID = bare production domain (stable — changing it bricks existing passkeys), origins ≤5. RP ID binds credentials: localhost testing needs RP ID `localhost`, production needs the prod domain — one project can't serve both, so test passkeys against the matching environment (or a staging project). Requires HTTPS (localhost exempt) and `supabase-js` ≥2.105 (repo has 2.116).

### Testing
- `lib/trips.test.ts`: save-payload validation + `isMissingTableError()` (PGRST205/42P01 detected, other errors ignored) + summary derivation (no `data`/`user_id` leak)
- `lib/username.test.ts`: email-prefix derivation, sanitization, validation rules, `displayName()` fallback chain
- `npm run typecheck`, `npm test` (26 tests), `npm run build` all green