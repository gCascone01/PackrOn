import { describe, expect, it } from "vitest"
import { buildAlternativesPrompt } from "./gemini-alternatives"
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
