import { describe, expect, it } from "vitest"
import {
  buildAlternativesPrompt,
  GEMINI_ALTERNATIVES_SCHEMA,
  mapAlternativeStops,
} from "./gemini-alternatives"
import type { Stop } from "./types"

const museum: Stop = {
  id: "s1",
  name: "Civic Museum",
  description: "Local art and history.",
  category: "cultura",
  time: "10:00",
  duration: "1h",
  lat: 45.0,
  lng: 9.0,
}

describe("buildAlternativesPrompt", () => {
  it("keeps the same-type rule when no hint is given", () => {
    const prompt = buildAlternativesPrompt(museum, "en")
    expect(prompt).toContain("same type")
    expect(prompt).not.toContain("User preference")
  })

  it("gives the user hint precedence over the type rule (hostel on a museum stop)", () => {
    const prompt = buildAlternativesPrompt(museum, "en", "Hostel")
    expect(prompt).toContain("Hostel")
    expect(prompt).toContain("takes precedence")
    expect(prompt).toContain("type=notte")
    expect(prompt).not.toContain("same type when realistic")
  })

  it("does the same in Italian", () => {
    const prompt = buildAlternativesPrompt(museum, "it", "ostello")
    expect(prompt).toContain("ostello")
    expect(prompt).toContain("precedenza")
    expect(prompt).toContain("type=notte")
  })
})

describe("EV charging alternatives", () => {
  it("allows and preserves ricarica alternatives in the Gemini schema and mapper", () => {
    const schema = GEMINI_ALTERNATIVES_SCHEMA as unknown as {
      properties: { alternatives: { items: { properties: { type: { enum: string[] } } } } }
    }
    expect(schema.properties.alternatives.items.properties.type.enum).toContain("ricarica")

    const chargingStop: Stop = { ...museum, category: "ricarica" }
    const [alternative] = mapAlternativeStops([{
      name: "Fast charging station",
      type: "ricarica",
      lat: 45.1,
      lng: 9.1,
      start_time: "10:00",
      end_time: "10:30",
      duration_minutes: 30,
      short_description: "A fast charging station.",
      sub_stops: [],
    }], chargingStop)

    expect(alternative.category).toBe("ricarica")
  })
})
