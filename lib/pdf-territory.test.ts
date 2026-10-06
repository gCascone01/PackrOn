import { describe, expect, it } from "vitest"
import { buildCityTripItinerary, buildRoadTripItinerary } from "./mock-itinerary"
import { clipSegment, getBoundaryLines, graticulePathD, projectPoint, scaleBarFor, territoryPathD, viewportFor } from "./pdf-territory"

const BOX = { width: 515, height: 190, pad: 10 }

describe("viewportFor", () => {
  it("expands the route bbox with an even margin on all sides", () => {
    const vp = viewportFor(
      [
        { lng: 10, lat: 45 },
        { lng: 14, lat: 47 },
      ],
      BOX,
      { margin: 0.5, minSpan: 0 },
    )!
    // Span 4°/2° + 50% margin each side → 8°/4° centered on the midpoint.
    expect(vp.minLng).toBeCloseTo(8)
    expect(vp.maxLng).toBeCloseTo(16)
    expect(vp.minLat).toBeCloseTo(44)
    expect(vp.maxLat).toBeCloseTo(48)
    expect(vp.cx).toBeCloseTo(12)
    expect(vp.cy).toBeCloseTo(46)
  })

  it("floors tiny spans so city trips still show surrounding territory", () => {
    const vp = viewportFor([{ lng: 12.5, lat: 41.9 }], BOX)!
    expect(vp.maxLng - vp.minLng).toBeGreaterThanOrEqual(3)
    expect(vp.maxLat - vp.minLat).toBeGreaterThanOrEqual(3)
  })

  it("returns null without points", () => {
    expect(viewportFor([], BOX)).toBeNull()
  })
})

describe("projectPoint", () => {
  it("maps the viewport center to the box center", () => {
    const vp = viewportFor(
      [
        { lng: 10, lat: 45 },
        { lng: 14, lat: 47 },
      ],
      BOX,
    )!
    const c = projectPoint(vp, { lng: vp.cx, lat: vp.cy })
    expect(c.x).toBeCloseTo(BOX.width / 2)
    expect(c.y).toBeCloseTo(BOX.height / 2)
  })
})

describe("clipSegment", () => {
  it("keeps fully visible segments", () => {
    expect(clipSegment(10, 10, 20, 20, 100, 100)).toEqual([10, 10, 20, 20])
  })

  it("drops fully invisible segments", () => {
    expect(clipSegment(-30, -30, -10, -10, 100, 100)).toBeNull()
    expect(clipSegment(110, 10, 130, 20, 100, 100)).toBeNull()
  })

  it("trims crossing segments to the box edge", () => {
    expect(clipSegment(-20, 50, 50, 50, 100, 100)).toEqual([0, 50, 50, 50])
    expect(clipSegment(50, 50, 50, 200, 100, 100)).toEqual([50, 50, 50, 100])
  })
})

describe("territoryPathD", () => {
  const vp = viewportFor(
    [
      { lng: 10, lat: 45 },
      { lng: 14, lat: 47 },
    ],
    BOX,
  )!

  it("draws in-viewport lines and drops far-away ones", () => {
    const d = territoryPathD(
      [
        [
          [11, 45.5],
          [12, 46],
          [13, 46.5],
        ],
        [
          [-100, -40],
          [-99, -39],
        ],
      ],
      vp,
    )
    expect(d).toMatch(/^M \d+,\d+( L \d+,\d+){2}$/)
    expect(d).not.toContain("NaN")
  })

  it("clips lines crossing the box edge instead of leaking coordinates", () => {
    const d = territoryPathD(
      [
        [
          [0, 46],
          [20, 46],
        ],
      ],
      vp,
    )
    const nums = d.match(/-?\d+/g)!.map(Number)
    const xs = nums.filter((_, i) => i % 2 === 0)
    const ys = nums.filter((_, i) => i % 2 === 1)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...xs)).toBeLessThanOrEqual(BOX.width)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(BOX.height)
  })
})

describe("getBoundaryLines", () => {
  it("decodes deduplicated country boundary arcs", () => {
    const lines = getBoundaryLines()
    expect(lines.length).toBeGreaterThan(100)
    expect(lines.every((l) => l.length >= 2)).toBe(true)
    // Same cached reference on repeat calls (decoded once per export page).
    expect(getBoundaryLines()).toBe(lines)
  })

  it("covers a real trip viewport with outline geometry", () => {
    const itinerary = buildRoadTripItinerary("en")
    const points = itinerary.days.flatMap((d) =>
      d.stops
        .filter((s) => s.kind !== "drive" && typeof s.lat === "number" && typeof s.lng === "number")
        .map((s) => ({ lng: s.lng as number, lat: s.lat as number })),
    )
    const vp = viewportFor(points, BOX)!
    const d = territoryPathD(getBoundaryLines(), vp)
    // Non-empty but compact: outlines, not a blob (110m data, 1px precision).
    expect(d.length).toBeGreaterThan(1000)
    expect(d.length).toBeLessThan(300_000)
  })

  it("zooms city trips to street scale instead of region scale", () => {
    const itinerary = buildCityTripItinerary("en")
    const points = itinerary.days.flatMap((d) =>
      d.stops
        .filter((s) => s.kind !== "drive" && typeof s.lat === "number" && typeof s.lng === "number")
        .map((s) => ({ lng: s.lng as number, lat: s.lat as number })),
    )
    // Tight floor (degeneracy guard only — the margin sets the zoom, so
    // a short walk fills the box instead of collapsing into pixels).
    const vp = viewportFor(points, BOX, { minSpan: 0.005 })!
    expect(vp.maxLng - vp.minLng).toBeLessThan(1)
    // The walking route actually fills the box instead of collapsing
    // into a couple of pixels.
    const xs = points.map((p) => projectPoint(vp, p).x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(50)
  })

  it("draws a graticule even where no boundary passes", () => {
    const itinerary = buildCityTripItinerary("en")
    const points = itinerary.days.flatMap((d) =>
      d.stops
        .filter((s) => s.kind !== "drive" && typeof s.lat === "number" && typeof s.lng === "number")
        .map((s) => ({ lng: s.lng as number, lat: s.lat as number })),
    )
    const vp = viewportFor(points, BOX, { minSpan: 0.005 })!
    // Seville viewport contains no country boundary (proven empty above),
    // but the grid still gives the map something to show.
    expect(territoryPathD(getBoundaryLines(), vp)).toBe("")
    const d = graticulePathD(vp)
    expect(d.length).toBeGreaterThan(0)
    const nums = d.match(/-?\d+/g)!.map(Number)
    const xs = nums.filter((_, i) => i % 2 === 0)
    const ys = nums.filter((_, i) => i % 2 === 1)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...xs)).toBeLessThanOrEqual(BOX.width)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(BOX.height)
  })

  it("picks a nice scale bar length for street and region zooms", () => {
    const cityItinerary = buildCityTripItinerary("en")
    const cityPoints = cityItinerary.days.flatMap((d) =>
      d.stops
        .filter((s) => s.kind !== "drive" && typeof s.lat === "number" && typeof s.lng === "number")
        .map((s) => ({ lng: s.lng as number, lat: s.lat as number })),
    )
    const cityBar = scaleBarFor(viewportFor(cityPoints, BOX, { minSpan: 0.005 })!)!
    // ~2km walk through Seville → ~1km bar.
    expect(cityBar.label).toMatch(/^(\d+ m|\d+ km)$/)
    expect(cityBar.widthPx).toBeGreaterThan(20)
    expect(cityBar.widthPx).toBeLessThanOrEqual(160)

    const roadItinerary = buildRoadTripItinerary("en")
    const roadPoints = roadItinerary.days.flatMap((d) =>
      d.stops
        .filter((s) => s.kind !== "drive" && typeof s.lat === "number" && typeof s.lng === "number")
        .map((s) => ({ lng: s.lng as number, lat: s.lat as number })),
    )
    const roadBar = scaleBarFor(viewportFor(roadPoints, BOX)!)!
    expect(roadBar.label).toMatch(/km$/)
    expect(roadBar.widthPx).toBeGreaterThan(20)
    expect(roadBar.widthPx).toBeLessThanOrEqual(160)
  })
})
