import { describe, expect, it } from "vitest"
import {
  fuelCost,
  formatDurationMinutes,
  formatEur,
  haversineKm,
  intraDayKm,
  roadTripOrigin,
  tollsCost,
  totalCost,
  totalDistanceKm,
  withLiveDistances,
} from "./trip-metrics"
import type { Itinerary, ItineraryDay, Stop } from "./types"

const a: Stop = {
  id: "a",
  name: "Vienna",
  description: "",
  category: "citta",
  time: "09:00",
  duration: "1h",
  lat: 48.2085,
  lng: 16.3735,
}
const b: Stop = { ...a, id: "b", name: "Melk", lat: 48.2281, lng: 15.3327 }
const c: Stop = { ...a, id: "c", name: "Bratislava", lat: 48.1486, lng: 17.1077 }

describe("trip distance metrics", () => {
  it("preserves zero-valued origin coordinates for road trips only", () => {
    expect(roadTripOrigin({ mode: "road", originLat: 0, originLng: 0 })).toEqual({ lat: 0, lng: 0 })
    expect(roadTripOrigin({ mode: "road", originLat: 0, originLng: undefined })).toBeUndefined()
    expect(roadTripOrigin({ mode: "city", originLat: 0, originLng: 0 })).toBeUndefined()
    expect(roadTripOrigin({ mode: "road", originLat: Number.NaN, originLng: 10 })).toBeUndefined()
  })

  it("computes a positive haversine distance between Vienna and Melk", () => {
    const km = haversineKm(a, b)
    expect(km).toBeGreaterThan(70)
    expect(km).toBeLessThan(90)
  })

  it("applies the road factor to intra-day distance", () => {
    expect(intraDayKm([a, b])).toBeCloseTo(haversineKm(a, b) * 1.35, 5)
    expect(intraDayKm([a])).toBe(0)
  })

  it("includes inter-day transfer distance from previous day's last stop", () => {
    const days: ItineraryDay[] = [
      { id: "d1", dayNumber: 1, title: "Day 1", distanceKm: 0, stops: [a] },
      { id: "d2", dayNumber: 2, title: "Day 2", distanceKm: 0, stops: [b] },
      { id: "d3", dayNumber: 3, title: "Day 3", distanceKm: 0, stops: [c] },
    ]
    const updated = withLiveDistances(days)
    expect(updated[0].distanceKm).toBe(0)
    expect(updated[1].distanceKm).toBeGreaterThan(90)
    expect(updated[2].distanceKm).toBeGreaterThan(120)
  })

  it("ignores coordinate-free drive entries when calculating map-based distances", () => {
    const drive: Stop = {
      ...a,
      id: "drive",
      name: "Drive from Vienna to Melk",
      kind: "drive",
      lat: null,
      lng: null,
    }
    const days: ItineraryDay[] = [{
      id: "d1",
      dayNumber: 1,
      title: "Vienna to Melk",
      distanceKm: 0,
      stops: [a, drive, b],
    }]

    expect(withLiveDistances(days)[0].distanceKm).toBe(Math.round(haversineKm(a, b) * 1.35))
  })
})

const itinerary: Itinerary = {
  mode: "road",
  title: "Test",
  subtitle: "Loop",
  origin: "Vienna",
  loop: true,
  vehicle: { type: "diesel", consumption: 6.5, fuelPrice: 1.72 },
  days: [
    { id: "d1", dayNumber: 1, title: "Day 1", distanceKm: 100, stops: [] },
    { id: "d2", dayNumber: 2, title: "Day 2", distanceKm: 50, stops: [] },
  ],
  tollNotices: [{ id: "t1", country: "AT", label: "Vignette", cost: 11.5, kind: "vignette" }],
}

describe("trip cost metrics", () => {
  it("sums distances from days when no estimate is set", () => {
    expect(totalDistanceKm(itinerary)).toBe(150)
  })

  it("prefers totalKmEstimated when present", () => {
    expect(totalDistanceKm({ ...itinerary, totalKmEstimated: 200 })).toBe(200)
  })

  it("computes fuel as (km/100)*consumption*price", () => {
    expect(fuelCost(itinerary)).toBeCloseTo(16.77, 2)
  })

  it("adds tolls to the trip total", () => {
    expect(totalCost(itinerary)).toBeCloseTo(28.27, 2)
  })

  it("prefers the live toll estimate over notice costs", () => {
    expect(tollsCost({ ...itinerary, tollTotalEur: 50 })).toBe(50)
    expect(totalCost({ ...itinerary, tollTotalEur: 50 })).toBeCloseTo(16.77 + 50, 2)
  })

  it("formats euro and duration", () => {
    expect(formatEur(12.5, "it")).toMatch(/12/)
    expect(formatDurationMinutes(90)).toBe("1h 30m")
    expect(formatDurationMinutes(0)).toBe("—")
  })
})
