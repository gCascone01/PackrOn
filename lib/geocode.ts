import type { Locale, MessageKey } from "./i18n"
import type { GenerateTripPayload } from "./types"

export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
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
    type?: string
    class?: string
    importance?: number
  }>

  if (!data.length) return null

  const best = data[0]
  return {
    lat: Number(best.lat),
    lng: Number(best.lon),
    displayName: best.display_name,
  }
}

export async function validateLocations(
  payload: GenerateTripPayload,
  locale: Locale
): Promise<{ valid: boolean; errorKey?: MessageKey; coords?: { originLat?: number; originLng?: number; destLat?: number; destLng?: number; cityLat?: number; cityLng?: number } }> {
  if (payload.mode === "city") {
    if (!payload.city?.trim()) return { valid: false, errorKey: "apiNeedCity" }
    return { valid: true }
  }

  if (!payload.origin?.trim()) return { valid: false, errorKey: "apiNeedRoute" }
  if (!payload.destination?.trim()) return { valid: false, errorKey: "apiNeedRoute" }

  return { valid: true }
}