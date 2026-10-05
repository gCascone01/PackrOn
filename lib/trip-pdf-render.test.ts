import { createElement, type ReactElement } from "react"
import { describe, expect, it } from "vitest"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import { TripPdfDocument } from "@/components/result/trip-pdf-document"
import { buildCityTripItinerary, buildRoadTripItinerary } from "@/lib/mock-itinerary"
import { totalDistanceKm } from "@/lib/costs"

function render(itinerary: ReturnType<typeof buildRoadTripItinerary>, locale: "en" | "it") {
  return renderToBuffer(
    createElement(TripPdfDocument, {
      itinerary,
      locale,
      totalKm: totalDistanceKm(itinerary),
      totalStops: itinerary.days.flatMap((d) => d.stops).length,
    }) as ReactElement<DocumentProps>,
  )
}

describe("TripPdfDocument render", () => {
  it("renders a road trip to a valid PDF buffer", async () => {
    const buffer = await render(buildRoadTripItinerary("en"), "en")
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-")
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it("renders a city trip to a valid PDF buffer", async () => {
    const buffer = await render(buildCityTripItinerary("it"), "it")
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-")
  })
})
