/**
 * Real-map background for the social preview image.
 *
 * The OG card used to draw the route as bare lines on an empty grid, which
 * reads as meaningless squiggles. This builds a URL for the keyless
 * mapmap.ai static-map endpoint (rate-limited, OSM attribution baked into
 * the render): real streets/terrain with our stop markers and a branded
 * route overlay, auto-framed on the points. Never throws — returns null
 * when there is nothing mappable or the URL would overflow the service's
 * 8000-byte query cap.
 */

export interface StaticMapPoint {
  lat: number
  lng: number
}

const STATIC_MAP_BASE = "https://mapmap.ai/api/static-map"
const QUERY_CAP = 8000
const URL_MARGIN = 1500
export const STATIC_MAP_MAX_POINTS = 30

function isValidPoint(point: StaticMapPoint): boolean {
  return (
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  )
}

/**
 * Static-map URL for the given points (origin first, then stops), or null.
 * Markers are `lng,lat` (`;`-separated, up to 30); the route is a GeoJSON
 * LineString with the brand-orange stroke. Long trips shed points (and, if
 * still too long, the path overlay) to stay under the query cap.
 */
export function buildStaticMapUrl(points: StaticMapPoint[], size = "640x640"): string | null {
  const valid = points.filter(isValidPoint)
  if (valid.length === 0) return null

  const base = `${STATIC_MAP_BASE}?size=${encodeURIComponent(size)}`
  for (const count of [STATIC_MAP_MAX_POINTS, 15]) {
    const subset = valid.slice(0, count)
    const markers = subset.map((p) => `${p.lng},${p.lat}`).join(";")
    let url = `${base}&markers=${encodeURIComponent(markers)}`
    if (subset.length > 1) {
      const geojson = JSON.stringify({
        type: "Feature",
        geometry: { type: "LineString", coordinates: subset.map((p) => [p.lng, p.lat]) },
        properties: { stroke: "#e78b30", "stroke-width": 6 },
      })
      const withPath = `${url}&geojson=${encodeURIComponent(geojson)}`
      if (withPath.length <= QUERY_CAP - URL_MARGIN) url = withPath
    }
    if (url.length <= QUERY_CAP - URL_MARGIN) return url
  }
  return null
}
