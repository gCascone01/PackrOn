/**
 * Live motorway toll estimates via the keyless OpenVan.camp API (CC BY 4.0).
 *
 * `GET /api/tolls/route?waypoints=Rome|Paris&vehicle_class=car` prices the
 * tolled route with per-country items (gated per-km sections, tunnels,
 * bridges, vignettes) and returns `total_eur` plus `route_countries`.
 * Every exported fetch never throws: failures resolve to `null` and the UI
 * falls back to the informational Gemini alerts ("See alerts", €0).
 */

import type { TollBreakdownLine } from "./types"

export type TollVehicleClass = "car" | "van"

export interface RouteTollEstimate {
  totalEur: number
  countries: string[]
  /** Provenance label for the UI (notes partial coverage when present). */
  source: string
  /** Priced components behind the total (per-country motorways + charges). */
  lines: TollBreakdownLine[]
}

const TOLLS_ROUTE_API = "https://openvan.camp/api/tolls/route"
const FETCH_TIMEOUT_MS = 10000
const CACHE_TTL_MS = 24 * 3600 * 1000

const cache = new Map<string, { expires: number; value: RouteTollEstimate }>()

/** Test hook: clear the in-memory cache. */
export function clearTollCache() {
  cache.clear()
}

/**
 * OpenVan vehicle class for toll pricing. The API only knows car/van/heavy;
 * motorbikes map to car (slight overestimate — operators rarely discount
 * bikes), campervans to van (unknown weight, van is the honest default).
 */
export function vehicleClassForTolls(vehicle: string): TollVehicleClass {
  return vehicle === "camper" ? "van" : "car"
}

type TollsRouteResponse = {
  total_eur?: unknown
  route_countries?: unknown
  partial?: unknown
  unknown_countries?: unknown
}

const MAX_BREAKDOWN_LINES = 10

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function chargeLabel(type: unknown, meta: { name?: unknown; valid_days?: unknown }): string {
  if (typeof meta.name === "string" && meta.name.trim()) return meta.name.trim().slice(0, 80)
  if (type === "vignette") {
    const days = typeof meta.valid_days === "number" && Number.isFinite(meta.valid_days)
      ? Math.max(1, Math.round(meta.valid_days))
      : 1
    return days > 1 ? `Vignette · ${days}-day` : "Vignette · 1-day"
  }
  return typeof type === "string" && type.trim() ? type.trim().slice(0, 40) : "Toll"
}

/**
 * Turn the API's per-section items into priced receipt lines: gated
 * per-km sections aggregated by country, tunnels/gates/ferries/vignettes as
 * individual charges (highest first). Zero-amount and malformed items are
 * skipped; the list is capped so one noisy route can't flood the UI.
 */
export function parseTollLines(json: unknown): TollBreakdownLine[] {
  const items = (json as { items?: unknown } | null)?.items
  if (!Array.isArray(items)) return []
  const perKm = new Map<string, { km: number; amount: number }>()
  const charges: TollBreakdownLine[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue
    const item = raw as { type?: unknown; country?: unknown; amount_eur?: unknown; meta?: unknown }
    if (typeof item.amount_eur !== "number" || !Number.isFinite(item.amount_eur)) continue
    if (item.amount_eur <= 0 || item.amount_eur > 2000) continue
    const country = typeof item.country === "string" && item.country.trim()
      ? item.country.trim().toUpperCase().slice(0, 4)
      : null
    if (!country) continue
    const meta = (item.meta ?? {}) as { km?: unknown; name?: unknown; valid_days?: unknown }
    if (item.type === "per_km") {
      const km = typeof meta.km === "number" && Number.isFinite(meta.km) && meta.km > 0 ? meta.km : 0
      const agg = perKm.get(country) ?? { km: 0, amount: 0 }
      agg.km += km
      agg.amount += item.amount_eur
      perKm.set(country, agg)
    } else {
      charges.push({
        kind: "charge",
        country,
        label: chargeLabel(item.type, meta),
        km: null,
        amountEur: round2(item.amount_eur),
      })
    }
  }
  const lines: TollBreakdownLine[] = [...perKm].map(([country, agg]) => ({
    kind: "perKm" as const,
    country,
    label: country,
    km: Math.round(agg.km),
    amountEur: round2(agg.amount),
  }))
  charges.sort((a, b) => b.amountEur - a.amountEur)
  lines.push(...charges.slice(0, Math.max(0, MAX_BREAKDOWN_LINES - lines.length)))
  return lines
}

/** Validate an API payload and extract the estimate; null when unusable. */
export function parseRouteTolls(json: unknown): RouteTollEstimate | null {
  if (!json || typeof json !== "object") return null
  const data = json as TollsRouteResponse
  const total = data.total_eur
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0 || total > 5000) return null
  const countries = Array.isArray(data.route_countries)
    ? data.route_countries.filter((c): c is string => typeof c === "string" && /^[A-Z]{2}$/.test(c))
    : []
  const partial = data.partial === true ||
    (Array.isArray(data.unknown_countries) && data.unknown_countries.length > 0)
  return {
    totalEur: total,
    countries,
    source: partial ? "OpenVan · partial coverage" : "OpenVan",
    lines: parseTollLines(json),
  }
}

/**
 * Sanitize waypoint names for the route API: trimmed, at least 2 chars,
 * consecutive duplicates removed, max 10 (API limit is 2-10 places).
 */
export function sanitizeWaypoints(waypoints: readonly (string | null | undefined)[]): string[] {
  const out: string[] = []
  for (const raw of waypoints) {
    const w = (raw ?? "").trim()
    if (w.length < 2) continue
    if (out.length > 0 && out[out.length - 1].toLowerCase() === w.toLowerCase()) continue
    out.push(w)
    if (out.length >= 10) break
  }
  return out
}

function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  )
}

function fmtCoord(lat: number, lng: number): string {
  return `${Number(lat.toFixed(5))},${Number(lng.toFixed(5))}`
}

/** Even downsampling that always keeps the first and last items. */
function downsample<T>(items: T[], max: number): T[] {
  if (max <= 0) return []
  if (items.length <= max) return [...items]
  if (max === 1) return [items[items.length - 1]]
  const out: T[] = []
  for (let i = 0; i < max; i++) {
    out.push(items[Math.round((i * (items.length - 1)) / (max - 1))])
  }
  return out
}

export interface TollWaypointDay {
  stops: Array<{ lat: number | null; lng: number | null }>
}

/**
 * Waypoint skeleton for the toll lookup, built from the itinerary's own
 * coordinates: origin + each day's last located stop (+ origin again for
 * loops), downsampled to the 10-waypoint API limit.
 *
 * Coordinates never fail geocoding — unlike free-text names (vague
 * destination descriptions) or flowery day titles ("Rientro panoramico a
 * Vienna"), either of which 422s the entire request and silently drops the
 * estimate back to "See alerts". Falls back to origin/destination names
 * when fewer than 2 coordinate points exist.
 */
export function buildTollWaypoints(args: {
  origin?: { lat: number; lng: number } | null
  originName?: string | null
  destinationName?: string | null
  days: TollWaypointDay[]
  loop: boolean
}): string[] {
  const points: string[] = []
  const push = (p: string) => {
    if (points.length === 0 || points[points.length - 1].toLowerCase() !== p.toLowerCase()) {
      points.push(p)
    }
  }

  const origin =
    args.origin && isValidCoord(args.origin.lat, args.origin.lng)
      ? fmtCoord(args.origin.lat, args.origin.lng)
      : null
  if (origin) push(origin)

  const dayEnds: string[] = []
  for (const day of args.days) {
    const located = (day.stops ?? []).filter((s) => isValidCoord(s.lat, s.lng))
    if (located.length > 0) {
      const last = located[located.length - 1]
      dayEnds.push(fmtCoord(last.lat as number, last.lng as number))
    }
  }
  const budget = 10 - points.length - (args.loop && origin ? 1 : 0)
  for (const end of downsample(dayEnds, Math.max(0, budget))) push(end)
  if (args.loop && origin) push(origin)

  if (points.length >= 2) return points.slice(0, 10)
  return sanitizeWaypoints([args.originName, args.destinationName])
}

/**
 * Live toll total for a waypoint route in EUR. Never throws.
 * Returns null when the API is unreachable or has no usable data.
 */
export async function getRouteTolls(
  waypoints: readonly (string | null | undefined)[],
  vehicleClass: TollVehicleClass,
): Promise<RouteTollEstimate | null> {
  const points = sanitizeWaypoints(waypoints)
  if (points.length < 2) return null
  const key = `tolls:${points.map((p) => p.toLowerCase()).join("|")}|${vehicleClass}`
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.value
  if (cached) cache.delete(key)

  try {
    const url = new URL(TOLLS_ROUTE_API)
    url.searchParams.set("waypoints", points.join("|"))
    url.searchParams.set("vehicle_class", vehicleClass)
    url.searchParams.set("locale", "en")
    url.searchParams.set("source", "packron.app")
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" })
    if (!res.ok) return null
    const estimate = parseRouteTolls(await res.json())
    if (estimate) cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value: estimate })
    return estimate
  } catch {
    return null
  }
}
