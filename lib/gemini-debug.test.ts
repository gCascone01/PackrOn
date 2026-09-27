import { afterEach, describe, expect, it, vi } from "vitest"
import { isGeminiDebugEnabled, logGeminiMappedItinerary } from "./gemini-debug"
import { mapGeminiTrip } from "./map-gemini-itinerary"
import type { GeminiTrip } from "./gemini-schema"
import type { GenerateTripPayload } from "./types"

const payload: GenerateTripPayload = {
  mode: "road",
  origin: "Milan",
  destination: "Rome",
  days: 1,
  pace: "balanced",
  locale: "en",
}

const raw: GeminiTrip = {
  trip_title: "Milan to Rome",
  summary: "A short road trip.",
  origin_lat: 45.46,
  origin_lng: 9.19,
  total_km_estimated: 500,
  estimated_fuel_cost_range: "80€ - 100€",
  toll_and_vignette_alerts: [],
  days: [{
    day_number: 1,
    title: "Day 1",
    driving_time_minutes: 120,
    stops: [{
      name: "Historic Center",
      type: "panoramica",
      lat: 44.4,
      lng: 8.9,
      start_time: "09:00",
      end_time: "11:00",
      duration_minutes: 120,
      short_description: "Explore the historic center.",
      sub_stops: [{
        name: "Cathedral",
        type: "church",
        description: "Admire the historic facade.",
      }],
      booking_query: "Historic Center",
      getyourguide_query: "Historic Center tour",
    }],
  }],
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Gemini development diagnostics", () => {
  it("requires both development mode and an explicit flag", () => {
    expect(isGeminiDebugEnabled({} as NodeJS.ProcessEnv)).toBe(false)
    expect(isGeminiDebugEnabled({ NODE_ENV: "production", DEBUG_GEMINI: "true" })).toBe(false)
    expect(isGeminiDebugEnabled({ NODE_ENV: "development", DEBUG_GEMINI: "false" })).toBe(false)
    expect(isGeminiDebugEnabled({ NODE_ENV: "development", DEBUG_GEMINI: "true" })).toBe(true)
  })

  it("does not mutate the mapped itinerary while logging the comparison", () => {
    const itinerary = mapGeminiTrip(raw, payload)
    const before = JSON.stringify(itinerary)
    vi.spyOn(console, "log").mockImplementation(() => {})

    logGeminiMappedItinerary(itinerary, raw)

    expect(JSON.stringify(itinerary)).toBe(before)
  })

  it("prints mapped and day-level comparison markers when invoked by the enabled route path", () => {
    const itinerary = mapGeminiTrip(raw, payload)
    const output: string[] = []
    vi.spyOn(console, "log").mockImplementation((value?: unknown) => {
      output.push(String(value))
    })

    logGeminiMappedItinerary(itinerary, raw)

    const text = output.join("\n")
    expect(text).toContain("=== PACKRON MAPPED ITINERARY START ===")
    expect(text).toContain("=== GEMINI DAY SUMMARY START ===")
    expect(text).toContain("Historic Center")
    expect(text).toContain("rawStopCount")
    expect(text).toContain("mappedStopCount")
    expect(text).toContain("Admire the historic facade.")
  })
})
