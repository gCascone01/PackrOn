import type { ItineraryDay, Stop } from "./types"

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

/**
 * Recomputes each day's total km deterministically: the live distance from the
 * previous day's last stop plus intra-day stops, combined with any base offset —
 * so removing/reordering stops updates total distance dynamically without AI calls.
 */
export function withLiveDistances(days: ItineraryDay[], origin?: { lat: number; lng: number }): ItineraryDay[] {
  return days.map((d, index) => {
    const prevDay = days[index - 1]
    const prevStop = prevDay ? locatedStops(prevDay.stops).at(-1) : undefined
    let computedKm = intraDayKm(d.stops, prevStop)
    // Add origin to first stop distance for the first day
    if (index === 0 && origin) {
      computedKm += originToFirstStopKm(origin, d.stops)
    }
    return {
      ...d,
      distanceKm: computedKm > 0 ? Math.round(computedKm) : d.distanceKm,
    }
  })
}
