import type { Locale, MessageKey } from "./i18n"
import type { GenerateTripPayload } from "./types"
import { haversineKmCoords } from "./geo"

export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
  /** ISO 3166-1 alpha-2 country code (uppercase) when Nominatim provides it. */
  countryCode?: string
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
const USER_AGENT = "PackrOn/1.0 (travel planner; geocode)"

export async function geocodeLocation(
  query: string,
  locale: Locale = "en"
): Promise<GeocodeResult | null> {
  const url = new URL(NOMINATIM_URL)
  url.searchParams.set("q", query)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "1")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("accept-language", locale)

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  })

  if (!res.ok) return null

  const data = (await res.json()) as Array<{
    lat: string
    lon: string
    display_name: string
    address?: { country_code?: string }
    type?: string
    class?: string
    importance?: number
  }>

  if (!data.length) return null

  const best = data[0]
  const countryCode = best.address?.country_code?.toUpperCase()
  return {
    lat: Number(best.lat),
    lng: Number(best.lon),
    displayName: best.display_name,
    ...(countryCode ? { countryCode } : {}),
  }
}

/**
 * Best-effort geocode that never throws: a network failure, a Nominatim gap,
 * or free-form text ("explore rural areas, then Slovakia...") all mean
 * "unknown" — never "invalid". Only Gemini judges plannability from there.
 */
async function safeGeocode(query: string, locale: Locale): Promise<GeocodeResult | null> {
  try {
    return await geocodeLocation(query, locale)
  } catch {
    return null
  }
}

export async function validateLocations(
  payload: GenerateTripPayload,
  locale: Locale
): Promise<{ valid: boolean; errorKey?: MessageKey; countryCode?: string; coords?: { originLat?: number; originLng?: number; destLat?: number; destLng?: number; cityLat?: number; cityLng?: number } }> {
  // Principle: reject if and only if the trip is confidently impossible.
  // A geocode miss proves nothing (free text, typos, obscure places,
  // Nominatim gaps) — in that case Gemini decides via the impossible_trip flag.
  if (payload.mode === "city") {
    if (!payload.city?.trim()) return { valid: false, errorKey: "apiNeedCity" }
    const city = await safeGeocode(payload.city, locale)
    if (city) return { valid: true, countryCode: city.countryCode, coords: { cityLat: city.lat, cityLng: city.lng } }
    return { valid: true }
  }

  if (!payload.origin?.trim()) return { valid: false, errorKey: "apiNeedRoute" }
  if (!payload.destination?.trim()) return { valid: false, errorKey: "apiNeedRoute" }

  const [origin, destination] = await Promise.all([
    safeGeocode(payload.origin, locale),
    safeGeocode(payload.destination, locale),
  ])

  // Confident fast path only: both ends resolved to real points more than
  // 10000 km apart (great-circle; driving distance can only be longer),
  // so the road trip is impossible regardless of wording.
  // This is the ONLY distance limit in the app: Gemini itself must never
  // impose one (see the prompt rules) — it only rejects unlocatable places
  // and routes needing a flight.
  if (origin && destination) {
    const distance = haversineKmCoords(
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng }
    )
    if (distance > 10000) return { valid: false, errorKey: "apiTooFar" }
    return {
      valid: true,
      countryCode: origin.countryCode,
      coords: {
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: destination.lat,
        destLng: destination.lng,
      },
    }
  }

  // Partial geocode: still expose whichever country we resolved so energy
  // prices can be country-dependent even when the other end is free text.
  return { valid: true, countryCode: origin?.countryCode ?? destination?.countryCode }
}