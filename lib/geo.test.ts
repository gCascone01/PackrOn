import { describe, expect, it } from "vitest"
import { haversineKm, intraDayKm } from "./geo"
import type { Stop } from "./types"

const a: Stop = {
  id: "a",
  name: "A",
  description: "",
  category: "citta",
  time: "09:00",
  duration: "1h",
  lat: 48.2085,
  lng: 16.3735,
}
const b: Stop = { ...a, id: "b", lat: 48.2281, lng: 15.3327 }

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
})
