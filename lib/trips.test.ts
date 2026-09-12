import { describe, expect, it } from "vitest"
import { isMissingTableError, toSavedTripSummary, validateSaveTripPayload, type SavedTrip } from "./trips"
import type { Itinerary } from "./types"

function baseItinerary(): Itinerary {
  return {
    mode: "road",
    title: "Test trip",
    subtitle: "sub",
    origin: "Vienna",
    loop: false,
    vehicle: { type: "benzina", consumption: 7, fuelPrice: 1.8 },
    days: [
      {
        id: "d1",
        dayNumber: 1,
        title: "Day 1",
        distanceKm: 10,
        stops: [
          {
            id: "s1",
            name: "Stop",
            description: "desc",
            category: "citta",
            time: "09:00",
            duration: "1h",
            lat: 48.2,
            lng: 16.37,
          },
        ],
      },
    ],
    tollNotices: [],
  }
}

describe("validateSaveTripPayload", () => {
  it("accepts a valid itinerary wrapped or bare", () => {
    const itin = baseItinerary()
    expect(validateSaveTripPayload({ itinerary: itin })).toEqual({ itinerary: itin })
    expect(validateSaveTripPayload(itin)).toEqual({ itinerary: itin })
  })

  it("rejects non-objects and non-itineraries", () => {
    expect(validateSaveTripPayload(null)).toHaveProperty("error")
    expect(validateSaveTripPayload({})).toHaveProperty("error")
    expect(validateSaveTripPayload({ itinerary: { mode: "road" } })).toHaveProperty("error")
  })

  it("rejects empty or oversized titles", () => {
    const empty = baseItinerary()
    empty.title = "   "
    expect(validateSaveTripPayload(empty)).toHaveProperty("error")

    const long = baseItinerary()
    long.title = "x".repeat(161)
    expect(validateSaveTripPayload(long)).toHaveProperty("error")
  })
})

describe("isMissingTableError", () => {
  it("detects a missing saved_trips table", () => {
    expect(isMissingTableError({ code: "PGRST205", message: "Could not find the table 'public.saved_trips' in the schema cache" })).toBe(true)
    expect(isMissingTableError({ code: "42P01", message: 'relation "saved_trips" does not exist' })).toBe(true)
  })

  it("ignores other failures", () => {
    expect(isMissingTableError(null)).toBe(false)
    expect(isMissingTableError({ code: "42501", message: "permission denied" })).toBe(false)
    expect(isMissingTableError({ message: "Could not save trip" })).toBe(false)
  })
})
describe("toSavedTripSummary", () => {
  it("derives day/stop counts without leaking the full payload", () => {
    const itin = baseItinerary()
    const row: SavedTrip = {
      id: "id-1",
      user_id: "user-1",
      title: itin.title,
      mode: itin.mode,
      origin: itin.origin,
      data: itin,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    }
    const summary = toSavedTripSummary(row)
    expect(summary).toMatchObject({ id: "id-1", days_count: 1, stops_count: 1 })
    expect(summary).not.toHaveProperty("data")
    expect(summary).not.toHaveProperty("user_id")
  })
})
