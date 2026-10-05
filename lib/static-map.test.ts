import { describe, expect, it } from "vitest"
import { buildStaticMapUrl } from "./static-map"

const ROME = { lat: 41.9, lng: 12.5 }
const MILAN = { lat: 45.46, lng: 9.19 }

describe("buildStaticMapUrl", () => {
  it("returns null with no mappable points", () => {
    expect(buildStaticMapUrl([])).toBeNull()
    expect(buildStaticMapUrl([{ lat: NaN, lng: 12.5 }])).toBeNull()
  })

  it("emits lng,lat markers and a route overlay", () => {
    const url = buildStaticMapUrl([ROME, MILAN])
    expect(url).toContain("markers=12.5%2C41.9%3B9.19%2C45.46")
    expect(url).toContain("geojson=")
    expect(url).toContain("size=640x640")
  })

  it("omits the path overlay for a single point", () => {
    const url = buildStaticMapUrl([ROME])
    expect(url).toContain("markers=")
    expect(url).not.toContain("geojson=")
  })

  it("stays under the service query cap on long trips", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ lat: 40 + i * 0.1, lng: 10 + i * 0.1 }))
    const url = buildStaticMapUrl(many)
    expect(url).not.toBeNull()
    expect((url as string).length).toBeLessThanOrEqual(6500)
  })
})
