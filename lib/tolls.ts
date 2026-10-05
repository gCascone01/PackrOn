/**
 * Live motorway toll estimates via the keyless OpenVan.camp API (CC BY 4.0).
 *
 * `GET /api/tolls/route?waypoints=Rome|Paris&vehicle_class=car` prices the
 * tolled route with per-country items (gated per-km sections, tunnels,
 * bridges, vignettes) and returns `total_eur` plus `route_countries`.
 * Every exported fetch never throws: failures resolve to `null` and the UI
 * falls back to the informational Gemini alerts ("See alerts", €0).
 */

export type TollVehicleClass = "car" | "van"

export interface RouteTollEstimate {
  totalEur: number
  countries: string[]
  /** Provenance label for the UI (notes partial coverage when present). */
  source: string
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
