import type { Itinerary, ItineraryDay, Stop } from "./types"
import type { Locale } from "./i18n"

const ROAD_FACTOR = 1.35

export function haversineKm(a: Stop, b: Stop): number {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0
  return haversineKmCoords(a as { lat: number; lng: number }, b as { lat: number; lng: number })
}

function locatedStops(stops: Stop[]): Stop[] {
  return stops.filter((stop) =>
    typeof stop.lat === "number" && Number.isFinite(stop.lat) &&
    typeof stop.lng === "number" && Number.isFinite(stop.lng),
  )
}

export function haversineKmCoords(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Deterministic intra-day driving distance from the current stop order. */
export function intraDayKm(stops: Stop[], previousStop?: Stop): number {
  const located = locatedStops(stops)
  let sum = 0
  if (previousStop && located.length > 0 && previousStop.lat != null && previousStop.lng != null) {
    sum += haversineKm(previousStop, located[0]) * ROAD_FACTOR
  }
  for (let i = 0; i < located.length - 1; i++) {
    sum += haversineKm(located[i], located[i + 1]) * ROAD_FACTOR
  }
  return sum
}

/** Distance from origin to first stop of the first day */
export function originToFirstStopKm(origin: { lat: number; lng: number } | undefined, stops: Stop[]): number {
  const firstStop = locatedStops(stops)[0]
  if (!origin || !firstStop) return 0
  return haversineKm({ lat: origin.lat, lng: origin.lng } as Stop, firstStop) * ROAD_FACTOR
}

export function roadTripOrigin(
  itinerary: Pick<Itinerary, "mode" | "originLat" | "originLng">,
): { lat: number; lng: number } | undefined {
  const { originLat: lat, originLng: lng } = itinerary
  if (
    itinerary.mode !== "road" ||
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    typeof lng !== "number" ||
    !Number.isFinite(lng)
  ) {
    return undefined
  }
  return { lat, lng }
}

/**
 * Recomputes each day's total km deterministically: the live distance from the
 * previous day's last stop plus intra-day stops, combined with any base offset —
 * so removing/reordering stops updates total distance dynamically without AI calls.
 */
export function withLiveDistances(days: ItineraryDay[], origin?: { lat: number; lng: number }): ItineraryDay[] {
  return days.map((day, index) => {
    const previousDay = days[index - 1]
    const previousStop = previousDay ? locatedStops(previousDay.stops).at(-1) : undefined
    let computedKm = intraDayKm(day.stops, previousStop)
    if (index === 0 && origin) {
      computedKm += originToFirstStopKm(origin, day.stops)
    }
    return {
      ...day,
      distanceKm: computedKm > 0 ? Math.round(computedKm) : day.distanceKm,
    }
  })
}

function bcp47(locale: Locale = "en") {
  return locale === "en" ? "en-GB" : "it-IT"
}

export function totalDistanceKm(itinerary: Itinerary): number {
  if (itinerary.totalKmEstimated && itinerary.totalKmEstimated > 0) {
    return itinerary.totalKmEstimated
  }
  return itinerary.days.reduce((sum, day) => sum + day.distanceKm, 0)
}

/**
 * Deterministic fuel estimate:
 * (Km totali / 100) * Consumo * Prezzo medio carburante
 */
export function fuelCost(itinerary: Itinerary): number {
  const km = totalDistanceKm(itinerary)
  const { consumption, fuelPrice } = itinerary.vehicle
  return (km / 100) * consumption * fuelPrice
}

export function tollsCost(itinerary: Itinerary): number {
  // Prefer the live route estimate when present: Gemini notices are
  // informational labels with cost 0, so summing them is always €0.
  if (typeof itinerary.tollTotalEur === "number" && Number.isFinite(itinerary.tollTotalEur)) {
    return Math.max(0, itinerary.tollTotalEur)
  }
  return itinerary.tollNotices.reduce((sum, toll) => sum + toll.cost, 0)
}

export function totalCost(itinerary: Itinerary): number {
  return fuelCost(itinerary) + tollsCost(itinerary)
}

export function formatEur(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(bcp47(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatKm(value: number, locale: Locale = "en"): string {
  return `${new Intl.NumberFormat(bcp47(locale)).format(Math.round(value))} km`
}

export function formatDurationMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  if (safe === 0) return "—"
  const hours = Math.floor(safe / 60)
  const remainingMinutes = safe % 60
  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`
  if (hours) return `${hours}h`
  return `${remainingMinutes}m`
}
