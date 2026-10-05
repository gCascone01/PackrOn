import { describe, expect, it } from "vitest"
import { tripPdfFilename } from "./trip-pdf"

describe("tripPdfFilename", () => {
  it("slugifies titles with diacritics stripped", () => {
    expect(tripPdfFilename("Siviglia in 3 giorni")).toBe("packron-siviglia-in-3-giorni.pdf")
    expect(tripPdfFilename("Seville in 3 days")).toBe("packron-seville-in-3-days.pdf")
    expect(tripPdfFilename("Anello dell'Europa Centrale")).toBe("packron-anello-dell-europa-centrale.pdf")
  })

  it("falls back for empty or punctuation-only titles", () => {
    expect(tripPdfFilename("")).toBe("packron-trip.pdf")
    expect(tripPdfFilename("  !!!  ")).toBe("packron-trip.pdf")
  })

  it("caps the slug at 60 chars without trailing dashes", () => {
    const name = tripPdfFilename(`${"a".repeat(50)} ${"b".repeat(50)}`)
    expect(name).toBe(`packron-${"a".repeat(50)}-${"b".repeat(9)}.pdf`)
  })
})
