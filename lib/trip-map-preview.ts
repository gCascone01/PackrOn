/**
 * Helpers for the route map used in the trip's social preview.
 */

interface StaticMapPoint {
  lat: number
  lng: number
}

const STATIC_MAP_BASE = "https://mapmap.ai/api/static-map"
const QUERY_CAP = 8000
const URL_MARGIN = 1500
const STATIC_MAP_MAX_POINTS = 30

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
    const markers = subset.map((point) => `${point.lng},${point.lat}`).join(";")
    let url = `${base}&markers=${encodeURIComponent(markers)}`
    if (subset.length > 1) {
      const geojson = JSON.stringify({
        type: "Feature",
        geometry: { type: "LineString", coordinates: subset.map((point) => [point.lng, point.lat]) },
        properties: { stroke: "#e78b30", "stroke-width": 6 },
      })
      const withPath = `${url}&geojson=${encodeURIComponent(geojson)}`
      if (withPath.length <= QUERY_CAP - URL_MARGIN) url = withPath
    }
    if (url.length <= QUERY_CAP - URL_MARGIN) return url
  }
  return null
}

export function normalizeCoordinates(
  points: StaticMapPoint[],
  width = 400,
  height = 300,
  padding = 40,
): Array<{ x: number; y: number }> {
  if (points.length === 0) return []

  const minLat = Math.min(...points.map((point) => point.lat))
  const maxLat = Math.max(...points.map((point) => point.lat))
  const minLng = Math.min(...points.map((point) => point.lng))
  const maxLng = Math.max(...points.map((point) => point.lng))

  const latDiff = maxLat - minLat || 1
  const lngDiff = maxLng - minLng || 1

  // Preserve aspect ratio.
  const scale = Math.min((width - padding * 2) / lngDiff, (height - padding * 2) / latDiff)

  const cx = (minLng + maxLng) / 2
  const cy = (minLat + maxLat) / 2

  return points.map((point) => {
    // Longitude maps to X; latitude maps to inverted Y.
    const x = width / 2 + (point.lng - cx) * scale
    const y = height / 2 - (point.lat - cy) * scale
    return { x, y }
  })
}
