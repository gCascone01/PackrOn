import { describe, expect, it } from "vitest"
import { haversineKm, intraDayKm, withLiveDistances } from "./geo"
import type { ItineraryDay, Stop } from "./types"

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

describe("geo", () => {
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
    // Day 2 distance includes Vienna -> Melk
    expect(updated[1].distanceKm).toBeGreaterThan(90)
    // Day 3 distance includes Melk -> Bratislava
    expect(updated[2].distanceKm).toBeGreaterThan(120)
  })
})
