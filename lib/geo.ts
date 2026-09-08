import type { ItineraryDay, Stop } from "./types"

const ROAD_FACTOR = 1.35

export function haversineKm(a: Stop, b: Stop): number {
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
export function intraDayKm(stops: Stop[]): number {
  let sum = 0
  for (let i = 0; i < stops.length - 1; i++) {
    sum += haversineKm(stops[i], stops[i + 1]) * ROAD_FACTOR
  }
  return sum
}

/**
 * Recomputes each day's total km deterministically: the fixed transfer leg
 * (stored in distanceKm) plus the live intra-day distance derived from the
 * current stop order — so removing/reordering updates km without any AI call.
 */
export function withLiveDistances(days: ItineraryDay[]): ItineraryDay[] {
  return days.map((d) => ({
    ...d,
    distanceKm: Math.round(d.distanceKm + intraDayKm(d.stops)),
  }))
}
