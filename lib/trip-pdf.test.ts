import { describe, expect, it } from "vitest"
import { tripPdfFilename } from "./trip-pdf"

describe("tripPdfFilename", () => {
  it("keeps the title's casing and spaces for a friendly name", () => {
    expect(tripPdfFilename("Siviglia in 3 giorni")).toBe("PackrOn - Siviglia in 3 giorni.pdf")
    expect(tripPdfFilename("Seville in 3 days")).toBe("PackrOn - Seville in 3 days.pdf")
    expect(tripPdfFilename("Anello dell'Europa Centrale")).toBe(
      "PackrOn - Anello dell'Europa Centrale.pdf",
    )
  })

  it("strips characters that are illegal in filenames", () => {
    expect(tripPdfFilename('Route: "North" <loop> | 2026?')).toBe(
      "PackrOn - Route North loop 2026.pdf",
    )
  })

  it("falls back for empty or whitespace-only titles", () => {
    expect(tripPdfFilename("")).toBe("PackrOn - Trip.pdf")
    expect(tripPdfFilename("   ")).toBe("PackrOn - Trip.pdf")
  })

  it("caps the title at 60 chars without a trailing space", () => {
    const name = tripPdfFilename(`${"a".repeat(50)} ${"b".repeat(50)}`)
    expect(name).toBe(`PackrOn - ${"a".repeat(50)} ${"b".repeat(9)}.pdf`)
  })
})
