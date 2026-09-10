import { describe, expect, it } from "vitest"
import { fuelCost, formatDurationMinutes, formatEur, totalCost, totalDistanceKm } from "./costs"
import type { Itinerary } from "./types"

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

describe("costs", () => {
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

  it("formats euro and duration", () => {
    expect(formatEur(12.5, "it")).toMatch(/12/)
    expect(formatDurationMinutes(90)).toBe("1h 30m")
    expect(formatDurationMinutes(0)).toBe("—")
  })
})
