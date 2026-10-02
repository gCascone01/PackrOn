import { ImageResponse } from "next/og"
import type { Itinerary } from "@/lib/types"
import { normalizeCoordinates } from "@/lib/map-svg"
import { createClient } from "@/lib/supabase/server"
import { isItinerary } from "@/lib/trips"

export const dynamic = "force-dynamic"
export const alt = "PackrOn itinerary preview"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const BRAND = "#0088ae"
const BRAND_DARK = "#0d5c7a"
const ACCENT = "#e78b30"
const SKY = "#eef9ff"
const CARD = "#ffffff"
const TEXT = "#0f172a"
const MUTED = "#47657d"
const BORDER = "rgba(15, 23, 42, 0.08)"
function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${SKY} 0%, #d8f2fb 100%)`,
          color: BRAND_DARK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", width: 64, height: 64, borderRadius: 32, background: BRAND, alignItems: "center", justifyContent: "center", color: "white", fontSize: 36, fontWeight: 800 }}>P</div>
          <span style={{ fontSize: 58, fontWeight: 800 }}>PackrOn</span>
        </div>
      </div>
    ),
    { ...size }
  )
}

function fitText(value: string, max = 54) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params
  let itinerary: Itinerary
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc("get_public_trip", { p_trip_id: id })
      .maybeSingle()
    if (error) throw error
    const tripData = (data as { data?: unknown } | null)?.data
    if (!isItinerary(tripData)) throw new Error(`Trip ${id} was not found`)
    itinerary = tripData
  } catch (error) {
    console.error("OG Image Load Error:", error)
    return fallbackImage()
  }

  const fallbackTitle = "PackrOn itinerary"
  const title = fitText(itinerary.title.trim() || fallbackTitle, 52)

  const allStops = itinerary.days.flatMap((day) => day.stops ?? [])
  const highlights = allStops
    .filter((stop) => stop.category !== "notte" && stop.category !== "sosta")
    .slice(0, 3)
    .map((stop) => stop.name)
    .filter(Boolean)
    .map((stop) => fitText(stop, 18))

  const points: Array<{ lat: number; lng: number }> = []
  if (typeof itinerary.originLat === "number" && typeof itinerary.originLng === "number") {
    points.push({ lat: itinerary.originLat, lng: itinerary.originLng })
  }
  for (const stop of allStops) {
    if (typeof stop.lat === "number" && typeof stop.lng === "number") {
      points.push({ lat: stop.lat, lng: stop.lng })
    }
  }

  const projected = points.length > 0 ? normalizeCoordinates(points, 360, 360, 26) : []
  const pathD = projected.length > 1 ? `M ${projected.map((point) => `${point.x},${point.y}`).join(" L ")}` : ""

  const modeLabel = itinerary.mode === "road" ? "Road trip" : "City trip"
  const daysLabel = `${itinerary.days.length} ${itinerary.days.length === 1 ? "day" : "days"}`

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 48,
          background: `linear-gradient(135deg, ${SKY} 0%, #f8fdff 100%)`,
          fontFamily: "sans-serif",
          color: TEXT,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at top right, ${ACCENT}22 0%, transparent 32%), radial-gradient(circle at bottom left, ${BRAND}33 0%, transparent 30%)`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 32,
            boxShadow: "0 30px 60px rgba(15, 23, 42, 0.12)",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: BRAND,
                  boxShadow: `0 0 0 6px ${BRAND}22`,
                }}
              />
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: 1.4, color: BRAND_DARK }}>PACKRON</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: `${BRAND}15`,
                  color: BRAND_DARK,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                }}
              >
                {modeLabel} • {daysLabel}
              </div>

              <h1 style={{ margin: 0, fontSize: 58, lineHeight: 1.02, fontWeight: 800, color: TEXT, maxWidth: 560 }}>
                {title}
              </h1>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {highlights.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {highlights.map((highlight, index) => (
                    <span
                      key={`${highlight}-${index}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: `${ACCENT}14`,
                        border: `1px solid ${ACCENT}25`,
                        color: TEXT,
                        fontSize: 18,
                        fontWeight: 600,
                      }}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, color: MUTED, fontSize: 22, fontWeight: 600 }}>
                <span>Trip starts at home</span>
                <span style={{ color: ACCENT, fontSize: 28 }}>•</span>
                <span>{allStops.length} stops</span>
              </div>
            </div>
          </div>

          <div
            style={{
              width: 430,
              minWidth: 430,
              background: `linear-gradient(180deg, ${BRAND}06 0%, ${BRAND}0a 100%)`,
              borderLeft: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 26,
            }}
          >
            <svg width={360} height={360} viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "hidden", borderRadius: 28 }}>
              <rect width={360} height={360} rx={28} fill="#f8fbff" />
              <g opacity={0.25}>
                <path d="M0 0H360V360H0Z" fill="none" stroke="#dfeaf1" strokeWidth="1" />
                {[...Array(10)].map((_, index) => (
                  <line key={`h-${index}`} x1={0} y1={index * 36} x2={360} y2={index * 36} stroke="#dfeaf1" strokeWidth="1" />
                ))}
                {[...Array(10)].map((_, index) => (
                  <line key={`v-${index}`} x1={index * 36} y1={0} x2={index * 36} y2={360} stroke="#dfeaf1" strokeWidth="1" />
                ))}
              </g>

              {pathD && (
                <path d={pathD} fill="none" stroke={ACCENT} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {projected.map((point, index) => {
                const isOrigin = index === 0
                if (isOrigin) {
                  return (
                    <g key={`origin-${index}`}>
                      <rect x={point.x - 7} y={point.y - 7} width={14} height={14} rx={3} fill={BRAND} />
                      <path d={`M ${point.x - 10} ${point.y + 10} L ${point.x} ${point.y - 12} L ${point.x + 10} ${point.y + 10} Z`} fill={BRAND} opacity={0.15} />
                    </g>
                  )
                }

                return <circle key={`stop-${index}`} cx={point.x} cy={point.y} r={6} fill={BRAND} stroke="#ffffff" strokeWidth={3} />
              })}
            </svg>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
