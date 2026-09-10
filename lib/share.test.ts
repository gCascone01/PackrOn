import { describe, expect, it } from "vitest"
import { decodeItinerary, encodeItinerary, isItinerary, buildShareUrl } from "./share"
import { isShareId } from "./share-store"
import type { Itinerary } from "./types"

const itinerary: Itinerary = {
  mode: "city",
  title: "Seville",
  subtitle: "Three days",
  origin: "Seville",
  loop: false,
  vehicle: { type: "diesel", consumption: 6.5, fuelPrice: 1.72 },
  days: [{ id: "d1", dayNumber: 1, title: "Centro", distanceKm: 0, stops: [] }],
  tollNotices: [],
}

describe("share", () => {
  it("round-trips gzipped itineraries", async () => {
    const token = await encodeItinerary(itinerary)
    expect(token.startsWith("v1.")).toBe(true)
    await expect(decodeItinerary(token)).resolves.toMatchObject({ title: "Seville", mode: "city" })
  })

  it("rejects invalid payloads", () => {
    expect(isItinerary(null)).toBe(false)
    expect(isItinerary(itinerary)).toBe(true)
  })

  it("builds locale-prefixed share URLs", () => {
    expect(buildShareUrl("https://packron.example", "v1.abc", "en")).toBe(
      "https://packron.example/en/i?d=v1.abc",
    )
  })

  it("validates short share ids", () => {
    expect(isShareId("abcdef")).toBe(true)
    expect(isShareId("../etc")).toBe(false)
  })
})
