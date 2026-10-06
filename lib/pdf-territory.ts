import { mesh } from "topojson-client"
import type { GeometryObject, Topology } from "topojson-specification"
import type { MultiLineString } from "geojson"
import countries110m from "world-atlas/countries-110m.json"

export interface LngLat {
  lng: number
  lat: number
}

export interface Viewport {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
  /** Pixels per degree — aspect-preserving fit of the viewport into the box. */
  scale: number
  cx: number
  cy: number
  width: number
  height: number
  pad: number
}

/**
 * Viewport around the route: the route bbox expanded by `margin` (fraction
 * of each span, applied on every side) with a `minSpan` floor in degrees so
 * short city trips still show the surrounding territory.
 */
export function viewportFor(
  points: LngLat[],
  box: { width: number; height: number; pad: number },
  opts?: { margin?: number; minSpan?: number },
): Viewport | null {
  if (points.length === 0) return null
  const margin = opts?.margin ?? 0.35
  const minSpan = opts?.minSpan ?? 3
  let minLng = Math.min(...points.map((p) => p.lng))
  let maxLng = Math.max(...points.map((p) => p.lng))
  let minLat = Math.min(...points.map((p) => p.lat))
  let maxLat = Math.max(...points.map((p) => p.lat))
  const dlng = Math.max(maxLng - minLng, minSpan)
  const dlat = Math.max(maxLat - minLat, minSpan)
  const cx = (minLng + maxLng) / 2
  const cy = (minLat + maxLat) / 2
  // Re-center on the route midpoint and grow symmetrically: the territory
  // margin is even on all sides even when minSpan kicks in.
  minLng = cx - (dlng / 2) * (1 + margin * 2)
  maxLng = cx + (dlng / 2) * (1 + margin * 2)
  minLat = cy - (dlat / 2) * (1 + margin * 2)
  maxLat = cy + (dlat / 2) * (1 + margin * 2)
  const spanLng = maxLng - minLng
  const spanLat = maxLat - minLat
  const scale = Math.min((box.width - box.pad * 2) / spanLng, (box.height - box.pad * 2) / spanLat)
  return { minLng, maxLng, minLat, maxLat, scale, cx, cy, width: box.width, height: box.height, pad: box.pad }
}

/** Same equirectangular projection as `normalizeCoordinates`, but anchored
 *  to the shared viewport so route and territory outlines align. */
export function projectPoint(viewport: Viewport, point: LngLat): { x: number; y: number } {
  return {
    x: viewport.width / 2 + (point.lng - viewport.cx) * viewport.scale,
    y: viewport.height / 2 - (point.lat - viewport.cy) * viewport.scale,
  }
}

// Cohen–Sutherland clipping of one segment to the map box. Territory
// geometry extends past every edge, and react-pdf SVG has no viewport
// clipping — without this, outlines would paint over the rest of the page.
const INSIDE = 0
const LEFT = 1
const RIGHT = 2
const BOTTOM = 4
const TOP = 8

function outCode(x: number, y: number, width: number, height: number): number {
  let code = INSIDE
  if (x < 0) code |= LEFT
  else if (x > width) code |= RIGHT
  if (y < 0) code |= TOP
  else if (y > height) code |= BOTTOM
  return code
}

export function clipSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  height: number,
): [number, number, number, number] | null {
  let a = outCode(x0, y0, width, height)
  let b = outCode(x1, y1, width, height)
  let cx0 = x0
  let cy0 = y0
  let cx1 = x1
  let cy1 = y1
  for (;;) {
    if ((a | b) === 0) return [cx0, cy0, cx1, cy1]
    if ((a & b) !== 0) return null
    const out = a !== 0 ? a : b
    let x = 0
    let y = 0
    if ((out & TOP) !== 0) {
      x = cx0 + ((cx1 - cx0) * (0 - cy0)) / (cy1 - cy0)
      y = 0
    } else if ((out & BOTTOM) !== 0) {
      x = cx0 + ((cx1 - cx0) * (height - cy0)) / (cy1 - cy0)
      y = height
    } else if ((out & RIGHT) !== 0) {
      y = cy0 + ((cy1 - cy0) * (width - cx0)) / (cx1 - cx0)
      x = width
    } else {
      y = cy0 + ((cy1 - cy0) * (0 - cx0)) / (cx1 - cx0)
      x = 0
    }
    if (out === a) {
      cx0 = x
      cy0 = y
      a = outCode(cx0, cy0, width, height)
    } else {
      cx1 = x
      cy1 = y
      b = outCode(cx1, cy1, width, height)
    }
  }
}

function ringBBox(line: Array<[number, number]>): [number, number, number, number] {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of line) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return [minLng, minLat, maxLng, maxLat]
}

/**
 * Territory outlines as one SVG path: every boundary linestring projected
 * through the viewport, clipped to the box, joined as M/L subpaths.
 * Integer precision keeps the path string small; one path keeps the PDF
 * content stream compact.
 */
export function territoryPathD(
  lines: Array<Array<[number, number]>>,
  viewport: Viewport,
): string {
  const parts: string[] = []
  for (const line of lines) {
    if (line.length < 2) continue
    const [l0, b0, l1, b1] = ringBBox(line)
    if (l1 < viewport.minLng || l0 > viewport.maxLng || b1 < viewport.minLat || b0 > viewport.maxLat) {
      continue
    }
    let pen = false
    for (let i = 0; i < line.length - 1; i++) {
      const p0 = projectPoint(viewport, { lng: line[i][0], lat: line[i][1] })
      const p1 = projectPoint(viewport, { lng: line[i + 1][0], lat: line[i + 1][1] })
      const clipped = clipSegment(p0.x, p0.y, p1.x, p1.y, viewport.width, viewport.height)
      if (!clipped) {
        pen = false
        continue
      }
      const [x0, y0, x1, y1] = clipped
      if (!pen) {
        parts.push(`M ${x0.toFixed(0)},${y0.toFixed(0)}`)
        pen = true
      }
      parts.push(`L ${x1.toFixed(0)},${y1.toFixed(0)}`)
    }
  }
  return parts.join(" ")
}

// Country boundary arcs (coastlines + land borders, deduplicated by mesh),
// decoded once and reused for every export.
let cachedLines: Array<Array<[number, number]>> | null = null

export function getBoundaryLines(): Array<Array<[number, number]>> {
  if (!cachedLines) {
    const topology = countries110m as unknown as Topology
    const geometry = mesh(
      topology,
      topology.objects.countries as unknown as GeometryObject,
    ) as unknown as MultiLineString
    cachedLines = geometry.coordinates as Array<Array<[number, number]>>
  }
  return cachedLines
}

const GRATICULE_STEPS = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]

/**
 * Lat/lng grid as one SVG path. Unlike country boundaries, the graticule
 * exists at every zoom — so a street-scale city viewport still reads as a
 * map instead of a blank page with a squiggle. Step adapts to the viewport
 * so lines sit ~60px apart.
 */
export function graticulePathD(viewport: Viewport): string {
  const rawStep = 60 / viewport.scale
  const step = GRATICULE_STEPS.find((s) => s >= rawStep) ?? 10
  const parts: string[] = []
  for (let lng = Math.ceil(viewport.minLng / step) * step; lng <= viewport.maxLng; lng += step) {
    const x = Math.round(viewport.width / 2 + (lng - viewport.cx) * viewport.scale)
    if (x < 0 || x > viewport.width) continue
    parts.push(`M ${x},0 L ${x},${viewport.height}`)
  }
  for (let lat = Math.ceil(viewport.minLat / step) * step; lat <= viewport.maxLat; lat += step) {
    const y = Math.round(viewport.height / 2 - (lat - viewport.cy) * viewport.scale)
    if (y < 0 || y > viewport.height) continue
    parts.push(`M 0,${y} L ${viewport.width},${y}`)
  }
  return parts.join(" ")
}

const SCALE_STEPS_M = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000]

export interface ScaleBar {
  label: string
  widthPx: number
}

/** Nice-length scale bar (~80px) for the printed map. */
export function scaleBarFor(viewport: Viewport): ScaleBar | null {
  const metersPerDegree = 111320 * Math.cos((viewport.cy * Math.PI) / 180)
  const metersPerPx = metersPerDegree / viewport.scale
  if (!Number.isFinite(metersPerPx) || metersPerPx <= 0) return null
  const nice = [...SCALE_STEPS_M].reverse().find((s) => s <= 80 * metersPerPx)
  if (!nice) return null
  return {
    label: nice >= 1000 ? `${nice / 1000} km` : `${nice} m`,
    widthPx: nice / metersPerPx,
  }
}
