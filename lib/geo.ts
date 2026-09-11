import type { ItineraryDay, Stop } from "./types"

const ROAD_FACTOR = 1.35

export function haversineKm(a: Stop, b: Stop): number {
  return haversineKmCoords(a, b)
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
  let sum = 0
  if (previousStop && stops.length > 0) {
    sum += haversineKm(previousStop, stops[0]) * ROAD_FACTOR
  }
  for (let i = 0; i < stops.length - 1; i++) {
    sum += haversineKm(stops[i], stops[i + 1]) * ROAD_FACTOR
  }
  return sum
}

/** Distance from origin to first stop of the first day */
export function originToFirstStopKm(origin: { lat: number; lng: number } | undefined, stops: Stop[]): number {
  if (!origin || stops.length === 0) return 0
  const firstStop = stops[0]
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
    const prevStop = prevDay && prevDay.stops.length > 0 ? prevDay.stops[prevDay.stops.length - 1] : undefined
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
