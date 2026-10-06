import { describe, expect, it } from "vitest"
import { TripPdfDocument } from "@/components/result/trip-pdf-document"
import { buildCityTripItinerary, buildRoadTripItinerary } from "@/lib/mock-itinerary"
import { totalDistanceKm } from "@/lib/costs"

function treeOf(itinerary: ReturnType<typeof buildRoadTripItinerary>, locale: "en" | "it"): unknown {
  // TripPdfDocument uses no hooks, so it can be invoked directly to
  // inspect the element tree (react-pdf primitives are plain strings:
  // "SVG", "G", "TEXT", ...). This stays fast — no PDF rendering needed.
  return TripPdfDocument({
    itinerary,
    locale,
    totalKm: totalDistanceKm(itinerary),
    totalStops: itinerary.days.flatMap((d) => d.stops).length,
  }) as unknown
}

function hasType(tree: unknown, type: string): boolean {
  if (!tree || typeof tree !== "object") return false
  if (Array.isArray(tree)) return tree.some((n) => hasType(n, type))
  if ((tree as { type?: unknown }).type === type) return true
  return hasType((tree as { props?: { children?: unknown } }).props?.children, type)
}

function flatText(children: unknown): string {
  if (typeof children === "string" || typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(flatText).join("")
  if (children && typeof children === "object" && "props" in children) {
    return flatText((children as { props?: { children?: unknown } }).props?.children)
  }
  return ""
}

describe("TripPdfDocument numbering", () => {
  it("numbers map markers and stop headings with the same global ordinal", () => {
    const itinerary = buildRoadTripItinerary("en")
    const tree = treeOf(itinerary, "en")

    const mapLabels: string[] = []
    const headings: string[] = []
    const visitableCount = itinerary.days
      .flatMap((d) => d.stops)
      .filter((s) => s.kind !== "drive").length

    const walk = (node: unknown, inSvg: boolean): void => {
      if (!node || typeof node !== "object") return
      if (Array.isArray(node)) {
        node.forEach((n) => walk(n, inSvg))
        return
      }
      const type = (node as { type?: unknown }).type
      const kids = (node as { props?: { children?: unknown } }).props?.children
      const svgNow = inSvg || type === "SVG"
      // Badge numerals only — the scale bar label ("500 m") is SVG text too.
      if (type === "TEXT" && inSvg && /^\d+$/.test(flatText(kids))) mapLabels.push(flatText(kids))
      if (type === "TEXT" && !inSvg) {
        const text = flatText(kids)
        if (/^\d+\. /.test(text)) headings.push(text)
      }
      walk(kids, svgNow)
    }
    walk(tree, false)

    expect(mapLabels.length).toBe(visitableCount)
    expect(headings.length).toBe(visitableCount)
    expect(mapLabels).toEqual(headings.map((_, i) => String(i + 1)))
  })

  it("renders no map for city trips", () => {
    const tree = treeOf(buildCityTripItinerary("en"), "en")
    expect(hasType(tree, "SVG")).toBe(false)
  })
})
