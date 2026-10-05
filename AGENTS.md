<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MANDATORY: Update AGENTS.md

**Every AI working on this project MUST update this file with all decisions and rationale after completing any task.** This file is the single source of truth for project architecture decisions. If you don't update it, the next AI (or human) will lose context and make mistakes. Do not wait to be asked — update it proactively.

# Project Decisions & Rationale

### Public trip view (2026-10-02)
- Generated and shared itineraries now use the localized `/{locale}/trip/{id}` route backed by `saved_trips`; `SavedTripView` loads the public row and renders the normal `ResultView`/`TripHero` once.
- The old localized `/i/{id}` path redirects to the matching `/trip/{id}` URL; the compressed itinerary-token route is removed.
- Rationale: there is one canonical trip page and one UUID across generation, sharing, guest retention, and account claiming.

### Dynamic social previews (2026-10-02)
- The dynamic OG image for a public trip lives at `app/[locale]/trip/[id]/opengraph-image.tsx` and uses the same brand palette and route-map composition as the previous shared-trip preview.
- The social preview uses the PackrOn blue brand color and orange accent color converted from the app’s OKLCH design tokens, while avoiding CSS variable references because `ImageResponse` needs fixed hex values.
- The 1200×630 preview includes “THE ROAD AHEAD” branding, trip title, mode, day/distance/stop statistics, highlight chips, and a compact route map that starts from the trip origin house marker and follows the itinerary path.
- The preview uses the default Node.js runtime and request-time image generation. It calls the UUID-scoped `get_public_trip` Supabase function directly and validates the returned itinerary; query failures, missing rows, and invalid payloads are logged and return a generic branded image.
- `/trip/[id]/page.tsx` generates localized trip title/description metadata from the same public-trip RPC and explicitly points both `openGraph.images` and `twitter.images` to the dynamic 1200×630 image route.
- Rationale: chat apps such as WhatsApp only render the social metadata image, so a dynamic OG preview gives a usable card even when the live app page is not rendered inline.

### Unified trip storage and guest claiming (2026-10-02)
- Every successful `/api/generate-trip` request inserts the mapped itinerary into Supabase `saved_trips` before returning. `user_id` comes only from the request's Supabase session, or remains null for a guest; the response includes the generated row UUID.
- The client navigates to `/{locale}/trip/{id}`. `GET /api/trips/{id}` resolves one public UUID through the `get_public_trip` security-definer function; direct table reads, updates, and deletes remain owner-only. Sharing calls Web Share when available and otherwise copies the public trip URL (the canonical current URL on public pages, mapped from account-library views); no second share record or encoded-itinerary URL is created.
- Because RLS now permits public trip reads, `GET /api/trips` also filters explicitly by the authenticated `user.id`; public lookup must not broaden the account's My Trips list.
- Migration `20261002000000_unify_trip_storage.sql` makes `user_id` nullable, allows anonymous inserts only with null ownership, exposes one row by UUID through a narrowly scoped function (not a table-wide public SELECT policy), and allows authenticated users to claim null-owner rows while setting ownership to `auth.uid()`.
- Guest page views are deduplicated in the `packron-guest-trips` localStorage list (capped at 20) and shown as Recent Trips on the planner. A guest viewing an orphaned trip can open the signup dialog; signup requires Supabase to return a session immediately, then automatically calls `POST /api/trips/claim`. Email confirmation flows and `claim` query parameters are intentionally unsupported.
- `ResultView` preserves its original itinerary snapshot while a guest edits; if the save control appears after signup/claim, it still detects those edits against the database version.
- Claim API input is a trip UUID only. RLS and the update filter both require a null current owner, and the API always supplies the logged-in user's ID from the server session.
- Legacy `/api/share` and filesystem storage (`fs`, `.data`, `/tmp`, `PACKRON_SHARE_DIR`) have been removed. The old localized `/i/{id}` URL redirects to the database-backed `/trip/{id}` route.
- Rationale: one database row is the canonical editable, saved, and shareable trip; guest retention and null-owner claiming bridge anonymous generation to account ownership without a second storage system.

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
- Hero map marker styling is isolated with `heroMap`: the origin is a white cyan-dot badge, intermediate stops are small cyan dots, and a one-way destination is a cyan target badge. The route is solid cyan with a translucent white halo; tooltips/interactions are suppressed, and the lower itinerary map keeps its existing numbered pins, tooltips, and styling.
- Hero origin and destination markers use the dedicated `heroEndpointPane` above Leaflet's regular marker pane, plus a high `zIndexOffset`, so intermediate stop markers cannot cover them. If no separate origin is available, the first stop uses the start badge and endpoint pane.
- Always pass a valid pane name to `L.marker`; use `markerPane` for ordinary markers rather than `undefined`, since Leaflet then cannot resolve the icon container when adding the marker.
- Omit optional `L.tileLayer` settings such as `subdomains` when unused; passing `undefined` overwrites Leaflet's defaults and can crash tile selection while reading `.length`.
- The Hero map uses CARTO Voyager when `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` is configured, passing it as `?key=` and showing linked OpenStreetMap/CARTO attribution. CARTO requests without a key show a watermark, so the Hero no-key fallback is the public OpenStreetMap tile endpoint with linked attribution. The lower itinerary map remains on OpenStreetMap with its original attribution and interaction settings. Hero camera fitting uses the route bounds with 35px padding, and Hero scroll-wheel zoom is disabled.
- The Hero map hides Leaflet's default attribution prefix with `map.attributionControl.setPrefix(false)`; required OpenStreetMap/CARTO tile credits remain visible. The lower itinerary map retains Leaflet's default prefix.
- Hero card uses a responsive 1200:630 desktop aspect ratio with a 7/5 content-to-map grid and a content-driven mobile layout. Its slate/white editorial palette uses the configured brand accent for icons and sign-off; the balanced title uses tight 1.12 leading, and the discreet localized PackrOn creator badge is text-only, with a brand-tinted frame and crisp slate text. The card then uses localized `What to expect` copy and a compact days/distance/stops metric strip below the subtitle; it shows up to the first three days as a vertical timeline with a subtle brand-color trail behind the day dots, followed by a remaining-days count and adventure sign-off. The lower result toolbar does not repeat those metrics. The map wrapper clips overflow, uses bottom-only rounding on mobile, and right-only rounding with no left divider border on desktop.
- With the Hero visible, Share is in the Hero top bar and Back sits above the card in the page header; restart/save remain in the lower toolbar. When the Hero is hidden, Share and Back remain in the toolbar.
- Cost Summary uses white bordered stat cards, a light brand-tinted total card, a compact amber toll-alert badge, and localized vehicle-aware estimate microcopy instead of the raw calculation formula.
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
- The `StepProgress` tabs are clickable buttons (`onSelect` → the configurator's `changeStep`): backward jumps are free, forward jumps run the same step-0 validation as Continue. The active tab stays static.

<### EV consumption units (kWh, not litres)
- `RoadTripConfigurator` consumption field is vehicle-aware: for `elettrica` the hint switches to `consumptionHintEv` ("kWh per 100 km") and the suffix to "kWh / 100 km"; fuel vehicles keep "L / 100 km". The cost formula (`lib/costs.ts`, `(km/100)*consumption*price`) is unit-agnostic, so only labels change — including `CostSummary`'s formula line (`× … kWh × … €/kWh` for EVs)
- EV defaults: selecting `elettrica` with the fossil default (or empty) still in the field prefills "18"; submit falls back to 18 for EVs vs 6.5 otherwise (mirrors `vehicleFromPayload` in `lib/map-gemini-itinerary.ts`, which the old `|| 6.5` fallback was overriding). Prefill is one-directional on purpose — switching back to a fuel vehicle never clobbers a possibly intentional value
- i18n keys: `consumptionHintEv` (both locales)
- Rationale: asking "litres per 100 km" for an electric car is nonsense input that also poisons the cost estimate; the unit must follow the selected vehicle

### Country-dependent live energy prices (2026-10)
- `lib/energy-prices.ts` resolves the unit price per vehicle instead of the old hardcoded `DEFAULT_FUEL_PRICE` table (kept only as offline fallback): motor fuel comes from the keyless OpenVan.camp API (`GET /api/fuel/prices?country={ISO2}`, 169 countries, weekly retail from EU Oil Bulletin/EIA/etc., CC BY 4.0), household electricity for EVs from Eurostat `nrg_pc_204` band DC (2500–4999 kWh, all taxes, EUR/kWh) via the keyless DBnomics mirror (`S.6000.KWH2500-4999.KWH.I_TAX.EUR.{CC}`, ~35 European countries).
- Fuel grade follows the vehicle (`benzina`/`moto` → gasoline chain, `diesel`/`camper` → diesel chain, first non-null grade wins); non-EUR currencies convert via OpenVan `/api/currency/rates` (base EUR) and US gallons / imperial gallons convert to litres. Out-of-range values (>10 €/L, >2 €/kWh) are rejected as bad data.
- Country comes from `geocodeLocation()`'s new `countryCode` (Nominatim `address.country_code`, uppercased), threaded through `validateLocations().countryCode` so `/api/generate-trip` needs no second geocode; `getEnergyPrice()` never throws and returns `{ priceEur, unit, countryCode, source, fallback }` with in-memory TTLs (fuel 6h, rates 24h, electricity 7d — Eurostat is semi-annual).
- `vehicleFromPayload(payload, priceOverride)` / `mapGeminiTrip(raw, payload, priceOverride)` stamp `Vehicle.fuelCountryCode/fuelPriceSource/fuelPriceFallback`; `GET /api/energy-prices?origin=…&vehicle=…` (or `?country=…`) exposes the same lookup for the client, which `RoadTripConfigurator` polls debounced to show a live-price hint under consumption, and `CostSummary` shows the provenance line when the price is live.
- Tested in `lib/energy-prices.test.ts` (grade picking, gallon/currency conversion, Eurostat latest-value, EV routing, never-throws fallback); `npm test` (78 tests), `npm run typecheck`, `npm run build` green.
- i18n keys: `fuelPriceLive`, `fuelPriceFallback`, `fuelPriceLoading` (both locales).
- Rationale: hardcoded 1.8/1.72/0.4 € values were stale averages that ignored the 169-country spread (e.g. IT petrol ~2.11 vs US ~1.04 €/L after conversion); weekly retail fuel + semi-annual household power are the right retail proxies for a trip-cost estimate, and keyless official-source APIs keep the feature working with no secrets to rotate.

### Live toll estimates (2026-10)
- Gemini `toll_and_vignette_alerts` are informational labels with hardcoded `cost: 0`, so `tollsCost()` summed to €0 and `CostSummary` almost always showed the "See alerts" badge. `lib/tolls.ts` now resolves a real total from the keyless OpenVan.camp API (`GET /api/tolls/route?waypoints={origin}|{destination}&vehicle_class={car|van}`, per-country gated/vignette/tunnel items, CC BY 4.0): `getRouteTolls()` never throws, caches 24h, rejects garbage/negatives/absurd totals (>€5000), and flags partial coverage in the source label.
- Vehicle class is `van` for campervans, `car` otherwise (moto → car is a slight overestimate; the API has no bike class). `/api/generate-trip` kicks off the energy lookup **before** the Gemini call so its latency hides inside generation, but the toll lookup runs **after** mapping: `buildTollWaypoints()` sends the itinerary's own coordinates (`origin` + each day's last located stop + `origin`-if-loop, downsampled to the 10-waypoint cap). Name-based routing was tried twice and abandoned — the free-text destination geocodes poorly ("Tuscany and Umbria…", underpriced routes) and flowery day titles ("Rientro panoramico a Vienna") 422 the entire request, silently dropping back to "See alerts". Coordinates never fail geocoding (verified live: Milan→Rome by coords = 572 km, €47.20). Origin/destination names remain only as a fallback with fewer than 2 coordinate points; lookup misses are `console.warn`ed server-side with the waypoint count. Results are stamped as `Itinerary.tollTotalEur/tollCountries/tollSource`. With `avoidTolls`, no lookup runs and `tollAvoided: true` + `tollTotalEur: 0` records "€0 by choice". City trips keep no toll fields.
- Both cost rows are deterministic (`(km/100) × consumption × live price`); Gemini's `estimatedFuelCostRange` free-text guess is no longer displayed anywhere (it routinely contradicted its own km estimate, e.g. "450€ – 550€" next to a computed €157, making every total look broken). The field stays in the type/DB for compatibility.
- `tollsCost()` prefers `tollTotalEur` when present (old notice-sum as fallback, so pre-existing saved trips are unaffected); `CostSummary` shows the amount + `tollEstimateLive` provenance (`IT → FR: €… · OpenVan`) or `tollAvoided` microcopy, and "See alerts" now appears only when no live data exists. The Trip total row is always the computed fuel + tolls sum — it previously reused Gemini's fuel-only `estimatedFuelCostRange` text, which hid the toll addition. The timeline's "Pedaggi e vignette verificati" pill was removed — it claimed verification that never happened (`transitTolls` i18n key removed with it).
- `parseTollLines()` turns the API's per-section `items` into priced receipt lines stored as `Itinerary.tollBreakdown`: gated per-km sections aggregated by country (km + amount), tunnels/gates/ferries/vignettes as individual charges (highest first, capped at 10 lines, zero/garbage items skipped). `CostSummary` renders them under `tollBreakdownTitle` above the advisory Gemini alerts, so every euro of the total is traceable. Gemini's own prose alerts cannot be priced 1:1 (they are text, not line items) — the receipt lines are the derivation.
- Purely-negative Gemini alerts ("No vignettes for passenger cars", "No tolls on this route") are dropped at mapping time by `isActionableTollAlert()` (`lib/map-gemini-itinerary.ts`): an alert must state something to do or pay now that real charges have priced lines. Mixed alerts naming a price ("…tunnel costs €9") are kept via a currency/price hint check (EN + IT patterns).
- Tested in `lib/tolls.test.ts` (class mapping, parse validation incl. partial/zero/garbage, caching, never-throws, waypoint builder, line parsing/aggregation/cap) + a `tollsCost` preference case in `lib/costs.test.ts` + negative-alert filtering in `lib/map-gemini-itinerary.test.ts`; `npm test` (98 tests), `npm run typecheck`, `npm run build` green.
- i18n keys: `tollEstimateLive`, `tollEstimateLiveNoRoute`, `tollAvoided`, `tollBreakdownTitle`, `tollBreakdownPerKm` (both locales).
- Rationale: a cost summary whose toll line is structurally always €0 trains users to ignore it; a live route-priced total (e.g. Rome→Paris ≈ €172) makes the trip total credible, while the Gemini alerts remain as the qualitative list (vignette duties, tunnel warnings).

### Crew selection (exclusive group + dog modifier)
- Road-trip step 1 "onboard" chips are not all multi-select: `solo`/`couple`/`family`/`friends` are mutually exclusive (selecting one replaces the other, dog preserved), while `dog` is an independent modifier toggling on top of any of them (`selectCrew` in `RoadTripConfigurator`)
- The field hint switched from the generic `multiSelect` to the dedicated `crewHint` ("Una sola compagnia, cane opzionale" / "One party, dog optional"); city-trip interests keep `multiSelect` since those genuinely combine
- i18n keys: `crewHint` (both locales)
- Rationale: contradictory combos like Solo + Couple reached Gemini verbatim in the crew line; the constraint belongs in the UI, not the prompt

### Planner draft persistence (localStorage, 2026-10)
- The original "Back preserves inputs" fix (form state lifted to `Planner`) only worked while `ResultView` rendered inline: since unified trip storage, generation does `router.push(/{locale}/trip/{id})`, unmounting `Planner` and destroying its `useState` — so Back from a trip page mounted a fresh blank form.
- `Planner` persists `{ mode, roadForm, cityForm, roadStep, cityStep }` to `packron-planner-draft` in localStorage and rehydrates in a mount `useEffect` (not the `useState` initializer, to avoid a server/client hydration mismatch). Persistence is **write-through in the event handlers** (`handleRoadForm`, `handleMode`, …) via a `draftRef` mirror — there is deliberately no persist `useEffect`. The first version had one (guarded by `rehydratedRef`), but it wrote blank defaults on mount before rehydrated state landed, and dev double-effects re-read that clobbered blank draft, so Back still showed empty fields. Drafts are sanitized field-by-field (`sanitizeDraft`, always returns a full draft with `DEFAULT_*` fallbacks) so corrupt/foreign data is safe.
- Rationale: React state cannot survive cross-page navigation; localStorage is the same pattern as `packron-guest-trips`/`packron-theme`, and it also restores drafts after a full reload.
- A small ghost reset button (`resetForm`: "Azzera"/"Reset", `RotateCcw` icon) sits in the wizard card header: `resetDraft()` restores both forms, both steps, and the mode to defaults and overwrites the stored draft, so users can empty stale pre-filled fields at any time.

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

### Stop replacement undo (toast + pinned previous)
- Replacing a stop via "Change stop" is revertible two ways, with no permanent new buttons
- **Undo toast**: `ResultView` keeps `lastReplaced: { dayId, stopId, prev }` and shows a transient bottom pill ("Tappa sostituita: {name}" + single Undo button, `stopReplaced`/`undo` keys) that auto-dismisses after 8s. Undo swaps the exact original stop back, so the save-trip dirty check (`JSON.stringify` snapshot) flips back to "Saved" automatically. Safe no-op if the stop was removed/reordered in the meantime; latest replace wins (single slot)
- **Pinned previous on reopen**: `ResultView` also keeps `prevByStopId: Record<newId, prevStop>`, threaded through `Timeline` into `StopCard.previousStop` and merged atop fresh alternatives via pure `withPreviousStop()` (`lib/alternatives.ts`, tested). The pinned row carries a `previousStop` badge and reuses the existing "Use" button — picking it swaps back and the other stop becomes pinnable, so users can flip back and forth
- State must live in `ResultView`, NOT `StopCard`: cards remount on every replace (`Timeline` fragments are keyed by `stop.id`), wiping any per-card memory
- i18n keys: `stopReplaced`, `undo`, `previousStop` (both locales)

### Custom alternative hint ("Change stop" input)
- Below the 3 alternative rows in `StopCard` there is a clickable text input + Search button (form, Enter submits): users can type something specific (e.g. "with sea view") and regenerate alternatives honoring it
- `StopCard` keeps local `hint` state and refetches `/api/suggest-stops` with `{ stop, locale, hint }` (trimmed, capped at 200 chars); input/button stopPropagation so typing/clicking never triggers card select; button disabled only when the hint is empty — the input stays usable while Gemini generates, and a new search aborts the in-flight fetch via `AbortController` so a stale response can never overwrite fresher results (aborted responses keep the currently shown state; only the latest request clears `loadingAlts`)
- The pinned previous stop stays visible during reload: the row JSX is shared via `renderAltRow()`, rendered above the loading skeletons while fetching and merged via `withPreviousStop()` once loaded — the undo target never disappears/reappears
- `/api/suggest-stops` accepts optional `hint: string` and forwards it to `buildAlternativesPrompt(stop, locale, hint)`, which appends a "User preference" line instructing Gemini to honor it while staying near the current stop and keeping the same type when realistic; empty hint leaves the prompt unchanged (mock fallback ignores the hint)
- **Hint takes precedence over the same-type rule**: when a hint is present the type rule is replaced with an explicit type-switch instruction (e.g. "hostel" → `type=notte` with `booking_query`, "restaurant" → `pasto`). Rationale: the original wording ("same type when realistic") made Gemini return nearby museums for a "Hostel" query on a museum stop; an explicit user preference must win, proximity is the only hard constraint. Covered by `lib/gemini-alternatives.test.ts`
- i18n keys: `altsHintPlaceholder`, `altsHintApply` (both locales)
- Rationale: the 3 generic alternatives often miss the user's actual need; a free-text preference steers Gemini without new screens or persistent state (hint is per-card local state, cleared on replace via remount — same pattern as `alts`)

### Nav launcher Apple logo (2026-10)
- All three nav-launcher buttons in `components/result/nav-launcher.tsx` use inline single-color brand SVGs: `AppleLogo` (Font Awesome `fa-apple` path, CC BY 4.0, attributed in a code comment — Lucide's `Apple` icon is a fruit, not the Apple logo), plus `GoogleMapsLogo` and `WazeLogo` (Simple Icons paths, CC0). Mixing Lucide outline icons with a solid Apple glyph looked inconsistent, so every button now shows its real brand mark in `currentColor`.
- Rationale: brand buttons should show brand marks; Lucide has no brand logos, only generic outline icons.

### Stop photos (Wikipedia, lazy-loaded with description)
- `/api/describe-stop` also returns `image: { url, title, pageUrl } | null` via new `lib/stop-image.ts`, fetched in parallel with the Gemini description
- Source is the Wikipedia Action API (`pageimages` + `info`), keyless and freely licensed: coordinate `geosearch` (2km radius, locale wiki then English fallback) → text search by stop name as fallback; never throws, 6s timeout, `null` when nothing found so the modal degrades to text-only
- `StopCard` modal renders the photo (`aspect-video object-cover`) above the text with a linked title + `imageViaWikipedia` caption for attribution (it/en)
- Image cached in component state alongside the description after first fetch
- Rationale: Wikipedia page images are real, freely-licensed photos needing no API key; AI-generated imagery would misrepresent real places. Plain `<img>` is used (no `next/image` remote config needed)
- Tested in `lib/stop-image.test.ts` via pure `pickStopImagePage()` (index-ordered pick, skips pages without thumbnails, canonical-URL fallback)

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
- Road-trip prompt wording is fixed to the user-approved text. The origin is always departure-only; the former `visitOrigin` toggle is removed. Form values are interpolated into the matching prompt fields and the road prompt is identical across UI locales.
- Route style is user-selectable in the style step using the existing alpine/villages/nature/coast options; no selections means `mix`. Stable option IDs map to English labels for the prompt.
- The road form no longer exposes free notes because the exact approved prompt has no notes field. Ask before making any wording changes to the road prompt.
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
- Also returns a Wikipedia stop photo (`image`, possibly `null`); both fetched in parallel via `Promise.all`, image failure never blocks the description
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
- Modal shows the Wikipedia photo (if any) above the description text with attribution caption

## i18n
- All user-facing strings in `lib/i18n.ts` under `messages.it` / `messages.en`
- `MessageKey` type ensures compile-time safety
- New keys must be added to both locales
- Wizard step labels (`roadStep*`, `cityStep*`) are single short words (Route/Style/Vehicle, Destination/Interests — Percorso/Stile/Veicolo, Destinazione/Interessi): the longer "X & Y" labels overflowed the `StepProgress` tabs. The label span also needs `min-w-0` for `truncate` to work inside flex, and connectors hide below `md` to leave room for labels

## Testing
- Mock itineraries in `lib/mock-itinerary.ts` include `originLat`/`originLng`
- Build with `npm run build` (includes TypeScript check)
- No test framework configured; manual verification via dev server

## SEO (`app/sitemap.ts`, `app/robots.ts`)
- Sitemap lists the 6 canonical locale URLs: `/{en,it}`, `/{en,it}/how-it-works`, `/{en,it}/examples` — derived from `LOCALES` in `lib/i18n.ts`
- Legacy slugs `/come-funziona` and `/esempi` are NOT in the sitemap (they 302-redirect in `proxy.ts`); listing redirecting URLs hurts SEO
- Dynamic trip routes (`/[locale]/trip/[id]`) excluded — itineraries are user-generated and must not be indexed; legacy `/i/{id}` redirects to the current route.
- Base URL from `NEXT_PUBLIC_SITE_URL` env with fallback to `https://packron.vercel.app` — set the env var when the production domain changes instead of editing code
- Rationale: sitemap must match the real `[locale]` route structure, not the pre-i18n slugs
- Every sitemap URL carries `alternates.languages` (`en`/`it`/`x-default`, absolute URLs) → Next renders `<xhtml:link hreflang>` entries, mirroring the hreflang link tags in metadata so Google serves the right locale

## Favicons & social metadata (`app/layout.tsx`, `app/[locale]/layout.tsx`, `app/manifest.ts`)
- All raster assets are generated from `public/logo.png` (the real brand mark — 1024×1024 square, pin icon centered with ~8% padding, transparent corners; normalized from the 1506×2189 portrait source in commit `9f4a605`). The v0 placeholders in `public/` (`icon.svg`, `icon-light/dark-32x32.png`, `apple-icon.png`, `placeholder-*`) are unreferenced leftovers; do not point metadata at them
- Generated assets in `public/`: `favicon.ico` (multi-size 16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180, flattened on white — iOS renders transparency as black), `android-chrome-192x192.png` + `android-chrome-512x512.png` (transparency kept), `og-image.png` (1200×630, logo centered on white at 460px height). Regenerate from `logo.png` with PIL if the brand mark changes
- Header (`site-header.tsx`) and hero (`planner.tsx`) treat the logo as a square icon (`80×80` / `256×256` props, `h-10 w-10` / `h-full w-auto`) — never wide-banner props; the old `180×60` / `620×220` props distorted portrait/square artwork
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
- Dark mode surfaces are neutral gray (hue 260, chroma ≤0.01) — NOT blue-slate; bg `0.27`, card/popover `0.31`, secondary/muted `0.33`. Brand blue 224 + orange accent 38 reserved for primary/accent/charts only, so backgrounds don't look "techy"
- Dark contrast: foreground `0.92`, muted-foreground `0.75` neutral; primary/accent keep light-theme hues lightened (`0.72`/`0.74`) with dark text for button contrast; borders/inputs are neutral white at 12%/16% opacity
- Dark mode body background uses subtle neutral radial gradients (8%/6% opacity) over a neutral base (not saturated brand glows)
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
- **Authorization**: base owner policies in `20260911000000_create_saved_trips.sql` are extended by `20261002000000_unify_trip_storage.sql`: trip reads are public by UUID, anonymous inserts must have null `user_id`, authenticated inserts/updates use `auth.uid()`, and only authenticated users can claim null-owner rows. `app/api/trips/claim/route.ts` and save routes derive ownership from the server-side session, never client input. Payloads remain re-validated server-side with `isItinerary()` + 500KB cap + 160-char title cap (`lib/trips.ts`).
- **Graceful pre-Supabase state**: until env vars are set, `isSupabaseConfigured()` / `AuthProvider.configured` degrade (auth UI explains setup, trip saving returns 503) while the rest of the app builds and runs. No dead imports, no crashes. Supabase Auth Email confirmation must be disabled so signups return a session immediately.
- **Immediate-session signup (2026-10)**: signup does not set `emailRedirectTo` or display a confirmation prompt. `onSignupSuccess` and guest-trip claiming run only when `signUp()` returns a session; a missing session is treated as a generic signup error. `app/auth/callback/route.ts` remains for other PKCE callback workflows, not signup verification.
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
- `app/api/trips/[id]/route.ts` — public GET by UUID; owner-only PUT overwrite and DELETE
- `app/api/trips/claim/route.ts` — authenticated claim of a null-owner trip
- `supabase/migrations/20261002000000_unify_trip_storage.sql` — nullable guest ownership, destination, public reads, and claim RLS
- `components/auth/auth-provider.tsx` — session context (`AuthProvider` in `components/providers.tsx`)
- `components/auth/auth-form.tsx` — login/signup tabs, client validation (email regex, min 8 chars), friendly Supabase error mapping
- `components/auth/auth-dialog.tsx` — modal used by header/save button (Esc + backdrop close, focus-safe). Rendered via `createPortal` to `document.body`: callers live inside filtered ancestors (sticky blurred header) that would otherwise trap `position: fixed` and break viewport centering; `min-h-full` flex wrapper keeps it centered and scrollable on small screens.
- `components/auth/user-menu.tsx` — header: login button → dialog when logged out; email dropdown (My trips + logout) when logged in. On mobile (`<sm`) the trigger is a circular avatar with the username's uppercase first letter; `sm+` keeps the icon + full name.
- `components/auth/save-trip-button.tsx` — tristate: never-saved → POST; saved+unedited → checked "Saved", click confirms + DELETEs (view stays open, button back to unsaved); saved+edited (snapshot mismatch on any reorder/remove/replace) → unchecked, click PUTs over the same id (POST fallback on 404). `ResultView` takes `savedId`; `SavedTripView` passes the trip id, `key={tripId}` remount, and resets state on id change.
- `app/[locale]/login/page.tsx`, `app/[locale]/signup/page.tsx` — full-page auth (`components/auth/auth-page.tsx`)
- `app/[locale]/trips/page.tsx` + `components/trips/my-trips-page.tsx` — saved-trip grid with delete (confirm dialog)
- `app/[locale]/trips/[id]/page.tsx` + `components/trips/saved-trip-view.tsx` — reopen a saved itinerary in `ResultView`

### i18n keys added
- `authTitle`, `authSubtitle`, `authLogin`, `authSignup`, `authLoginAction`, `authSignupAction`, `authEmail`, `authPassword`, `authPasswordHint`, `authWorking`, `authClose`, `authInvalidEmail`, `authPasswordShort`, `authNotConfigured`, `authGenericError`, `authWrongCredentials`, `authAlreadyRegistered`, `authRateLimited`, `authEmailRateLimited`, `authSecurityNote`, `authLogout`, `authAccount`, `authMyTrips`, `authLoginRequired`, `tripSave`, `tripSaving`, `tripSaved`, `tripSaveFail`, `tripsTitle`, `tripsSubtitle`, `tripsEmpty`, `tripsEmptyAction`, `tripsOpen`, `tripsDelete`, `tripsDeleting`, `tripsDeleteFail`, `tripsLoadFail`, `tripsDeleteConfirm`, `tripsSignInPrompt`, `tripsSetupRequired`, `accountTitle`, `accountSubtitle`, `accountEmail`, `accountUsername`, `accountUsernameHint`, `accountNewPassword`, `accountNewPasswordHint`, `accountConfirmPassword`, `accountSave`, `accountSaving`, `accountSaved`, `accountSaveFail`, `accountPasswordMismatch`, `accountInvalidUsername`, `accountSetupRequired`, `authPasskeyOr`, `authPasskeyButton`, `authPasskeyWorking`, `authPasskeyUnavailable`, `authPasskeyUnsupported`, `authPasskeyNotFound`, `accountPasskeysTitle`, `accountPasskeysBody`, `accountPasskeyAdd`, `accountPasskeyAdding`, `accountPasskeyAdded`, `accountPasskeyRemoved`, `accountPasskeyEmpty`, `accountPasskeyRemove`, `accountPasskeyRemoving`, `accountPasskeyFail`, `accountPasskeyConfirmEmail`, `accountPasskeyExists`, `accountPasskeyRename`, `accountPasskeySave`, `accountPasskeyCancel`, `accountPasskeyRenamed` (both locales)
- Auth rate limits (2026-09): Supabase returns 429 for distinct limits — `over_email_send_rate_limit` (built-in provider: 2 emails/hour project-wide) vs generic IP/request limits. `AuthForm` inspects both `error.code` and message (old code only checked `message`, missing the code) and shows `authEmailRateLimited` vs `authRateLimited` (wait a minute). `authEmailRateLimited` copy stays end-user friendly ("too many signups, try again later") with no Supabase/SMTP detail — the 2/hour + custom-SMTP fix lives only in the code comment and here. Rationale: "wait a minute" is wrong for the email cap and users kept retrying, extending the block.

### Missing-table diagnosis (2026-09: live debug)
- Both "Couldn't load saved trips" and "Couldn't save the trip" traced to `PGRST205` — the `saved_trips` migration was never run in the Supabase project (verified via anon REST probe: table absent from schema cache).
- Fix: `lib/trips.ts#isMissingTableError()` detects PGRST205/42P01; routes return 503 `{error: "setup_required"}` + `console.error` server-side; UI maps it to `tripsSetupRequired` (tells the user to run the migration file in the SQL editor). Tested in `lib/trips.test.ts`. Actual data fix still requires running the migration once in the dashboard.

### SEO
- `/login`, `/signup` (all locales) ARE in `app/sitemap.ts` (priority 0.5, public auth entry points) and allowed in `app/robots.ts`.
- `/trips`, `/trips/[id]`, `/trip/[id]`, `/account` (all locales) + `/auth/*` + `/api/` are `disallow`ed in `app/robots.ts` and excluded from `app/sitemap.ts` — account and user-generated trip routes must never be indexed.

### Username & account page
- Username lives in Supabase Auth `user_metadata.username` (no extra table — avoids a second source of truth and extra RLS surface).
- `lib/username.ts`: `defaultUsername(email)` (prefix before `@`, sanitized to `[a-zA-Z0-9._-]`, ≤30 chars, `traveler` fallback), `isValidUsername()` (3–30 same charset), `displayName(user)` (stored → derived → email → "Account"). Tested in `lib/username.test.ts`.
- Signup (`auth-form.tsx`) seeds `options.data.username`; existing users without metadata get the derived fallback automatically.
- `app/[locale]/account/page.tsx` + `components/auth/account-page.tsx`: read-only email, editable username, optional new-password + confirm (min 8, match check), single `auth.updateUser()` call. Header `UserMenu` shows `displayName()` + links to Account and My trips.
- **Delete account**: danger zone at the bottom of the account page with an explicit cannot-be-undone notice; deletion requires typing the current username, then `DELETE /api/account` calls the `delete_own_account()` SECURITY DEFINER function (`supabase/migrations/20260912000000_delete_own_account.sql`, EXECUTE granted to `authenticated` only), which deletes only the caller's `auth.users` row (saved trips cascade). No service-role key used. Missing function (PGRST202) maps to distinct `account_setup_required` 503 (never the trips `setup_required`, which points at the wrong migration) so the UI shows `accountSetupRequired` with the delete-migration filename; the client also treats legacy `setup_required` as `accountSetupRequired` for backwards compat (2026-09 fix: delete failures previously showed the trips-table message).

### Passkeys (Supabase-native, beta)
- Supabase Auth beta passkeys (WebAuthn) via `supabase-js` high-level API (`auth.signInWithPasskey()`, `auth.registerPasskey()`, `auth.passkey.list()/delete()`) — no custom crypto, no extra tables, no service-role key; Supabase stores public keys and issues the session, same httpOnly-cookie flow as password login.
- Browser client opts in with `auth: { experimental: { passkey: true } }` (without it every passkey method throws; the experimental API may change without notice).
- Login: "Continue with passkey" button (`auth-form.tsx`, also inside `AuthDialog`) runs the discoverable-credential ceremony — no email needed upfront, the authenticator picks the account; success follows the same redirect as password login. It renders on the login tab only — passkeys are login-only (enrollment happens post-login on the account page), so showing it under signup was a dead end. The button only renders when `window.PublicKeyCredential` exists (enabled in a mount effect to avoid hydration mismatch); deliberately NOT gated on platform-authenticator availability so security-key / hybrid (phone QR) users keep it.
- Enrollment/management: passkeys section on the account page (`registerPasskey()` requires a signed-in, confirmed, non-anonymous user; list shows friendly name + creation date; per-item inline rename via `passkey.update()` + remove).
- Error mapping (`lib/passkeys.ts`): dismissed browser prompts (`NotAllowedError`/`AbortError`, incl. nested `cause` and `ERROR_CEREMONY_ABORTED`) stay silent; `passkey_disabled` → `authPasskeyUnavailable`, unsupported browser → `authPasskeyUnsupported`, no credential on device → `authPasskeyNotFound`, unconfirmed email on enroll → `accountPasskeyConfirmEmail`, already-registered authenticator → `accountPasskeyExists`. All user-facing copy stays end-user friendly (no Supabase detail).
- **Dashboard setup required**: Authentication → Passkeys → enable, RP display name "PackrOn", RP ID = bare production domain (stable — changing it bricks existing passkeys), origins ≤5. RP ID binds credentials: localhost testing needs RP ID `localhost`, production needs the prod domain — one project can't serve both, so test passkeys against the matching environment (or a staging project). Requires HTTPS (localhost exempt) and `supabase-js` ≥2.105 (repo has 2.116).

### Testing
- `lib/trips.test.ts`: save-payload validation + `isMissingTableError()` (PGRST205/42P01 detected, other errors ignored) + summary derivation (no `data`/`user_id` leak)
- `lib/username.test.ts`: email-prefix derivation, sanitization, validation rules, `displayName()` fallback chain
- `npm run typecheck`, `npm test` (26 tests), `npm run build` all green

## Docs

### README vs AGENTS.md
- `README.md` is the user/contributor-facing overview (stack, features, setup, env, routes, sharing vs saved trips, key files). It must stay in sync with reality: no "no authentication" leftovers, real locale slugs (`/how-it-works`, `/examples`), all API routes, Supabase setup steps.
- `AGENTS.md` remains the single source of truth for architecture decisions and rationale. README links to it instead of duplicating reasoning.
- Rationale (2026-09 refresh): README had drifted — it still claimed "no authentication", listed removed Italian slugs, and omitted Supabase env vars, trips/account APIs, passkeys, dark mode, and SEO work.

### Historical Phase 5 Gemini prompt calibration (superseded for road trips)
- `buildTripPrompt()` no longer defines a complete day through fixed stop counts. The former `5-7 meaningful stops` target and `at least 3 stops` minimum were removed because the day-completeness model is contextual, not count-based.
- City and road prompts now ask Gemini to generate enough meaningful experiences to naturally occupy each day, with realistic `duration_minutes`; substantial experiences may last several hours, but durations must not be inflated to fill time.
- Normal days are described as a flexible morning-to-midday-to-afternoon progression. Evening activity, dinner, and lodging remain conditional rather than mandatory for every day, and unexplained conceptual gaps remain discouraged.
- Pace now affects activity density: relaxed days use fewer experiences, longer visits, and more transition time; balanced days use normal coverage; intense days add experiences only when geography and logistics support them.
- Road-day density follows driving burden: low-driving days can support fuller sightseeing, moderate-driving days use fewer meaningful experiences, and high-driving days prioritize realistic driving plus one or two worthwhile experiences. `driving_time_minutes` remains a planning/burden metric, not exact stop timestamp simulation.
- The historical flexible road prompt allowed shorter first/final days and supported `visitOrigin`; these statements no longer describe the active road prompt. The city-trip prompt remains separate.
- Multi-day prompts still require exactly the requested number of day entries and distribute meaningful experiences, driving, meals, lodging, rest, and logistics across all days without repetitive filler. Prompt wording does not control Gemini/API output-token limits; truncation remains an external generation-configuration concern.
- The Phase 5 prompt changes intentionally leave the Phase 4 validator, Gemini schema, API repair behavior, and frontend unchanged.
- Phase 5.1 adds a qualitative final day-completion check to `buildTripPrompt()`: when substantial usable time remains without an arrival, departure, driving, rest, destination, opening-hours, or travel constraint, Gemini should add another meaningful geographically coherent experience rather than ending early. This remains contextual, has no stop-count threshold, and never asks for filler; moderate road driving alone is not an early-stop justification.
- Phase 5.2 strengthens the road-trip daily structure: normal full travel days should have a rich morning-to-evening progression with meaningful sightseeing, appropriate midday/lunch and evening logistics, while arrival, transfer, departure, return, rest-oriented, unusually driving-heavy, and destination-constrained days remain contextual exceptions. Moderate driving receives a balanced selection of core experiences without a fixed count, and the prompt still forbids filler or artificial duration inflation.
- Phase 5.3 replaces the flexible road-day progression with an explicit rich daily program for standard travel days: five distinct non-hotel experiences covering morning, midday, lunch, afternoon, and late afternoon, with a count check that injects local points of interest below four experiential stops. This is an intentional prompt-level density constraint for the current calibration pass; contextual short-day exceptions and realistic driving requirements remain preserved.
- Phase 5.4 restores qualitative road-day planning: each day should be full enough for the selected pace, with natural landmark, meal, break, lodging, and logistics planning, but without fixed stop counts or a mandatory daily structure. The prompt retains a contextual usable-time check, realistic duration guidance, driving-burden-aware density, exact requested day count, and first/final-day exceptions.

### Approved Road Prompt (2026-09)
- The current road prompt in `lib/gemini-prompt.ts` reproduces the user-approved wording verbatim; only the trip-specific form values are substituted. `lib/gemini-prompt.test.ts` checks the complete generated string. The 2026-09-27 revisions add scale-appropriate multiple substops for long experiences, require evening activities to remain separate main stops before check-in, limit `notte` descriptions to the accommodation itself, and curate GetYourGuide suggestions for high-value bookable experiences only. Suggestions should be relevant to guided interpretation, meaningful time savings, or unique regional activities; do not attach tours to ordinary self-guided stops or spam booking suggestions.
- Prompt language is always English regardless of UI locale. The template substitutes origin, destination, duration, trip type, stays, pace, crew, route style, vehicle, consumption, and toll preference.
- The response schema allows omitted or null coordinates for drive stops and omitted duration for overnight stops, matching the approved prompt's explicit exceptions.
- Any future change to road prompt wording must be proposed and approved by the user before it is applied. Do not silently edit, paraphrase, append, or translate it.

### Timed main stops and substops (2026-09)
- Gemini emits English itinerary content regardless of the selected UI locale. Days contain relative day numbers only, and each top-level stop is a timed MAIN STOP with explicit `start_time`/`end_time`, description, and nested `sub_stops`; substops have names and optional item-specific `booking_query`/`getyourguide_query`, never their own schedule.
- Main stop types now include `drive` and `breakfast`; lunch/dinner remain `pasto`. Meals keep regional dishes in the main description and have no substops. Sightseeing details belong inside the parent experience's substops instead of duplicating the experience as several top-level stops.
- Drive entries combine departure with the first leg, omit coordinates, and remain timeline items without map/navigation actions. Distance calculations and map markers use only coordinate-bearing stops, connecting located stops across intervening drive rows. Overnight stops retain their check-in time window but omit duration; their exact hotel/B&B name is the displayed name and their booking search includes the city.
- `Stop` carries optional `endTime`, optional `duration`, nullable coordinates, `kind`, and nested `substops`. These fields serialize through existing saved/shared itinerary JSON without separate migrations. `StopCard` renders substop names and their own search links; generic parent activity links are suppressed when item-specific links are available.
- Substops are presented under the "Included in this stop" label as compact nested cards: icon/name/Maps action in the top row, description directly beneath, and applicable booking/ticket pills at bottom right. No inner divider is used. The road prompt and response schema require a substop type and concise English description; direct booking URL and existing query fields remain optional. Parent stop actions are separated below with a divider, and generic parent experiences remain suppressed when substops exist.
- Rationale: precise continuous schedules and nested attraction details make the itinerary scannable and actionable while preserving one map/timeline item per real-world experience and preventing drive legs from corrupting coordinate-derived distances.

### Gemini generation diagnostics (2026-09)
- A temporary server-side diagnostic is available in `app/api/generate-trip/route.ts` through `lib/gemini-debug.ts`. It activates only when `NODE_ENV === "development"` and `DEBUG_GEMINI === "true"`.
- When enabled, it logs the exact prompt, raw Gemini response before parsing, parsed JSON, mapped itinerary, and a raw-versus-mapped day summary including mapped substop names and descriptions. Nothing is added to the API response; generation parameters and user-facing behavior are unchanged.
- Rationale: capture one real request to determine whether under-filled days originate in Gemini or in post-generation transformation. The diagnostic is intentionally local-development-only and does not log API keys or authorization headers.