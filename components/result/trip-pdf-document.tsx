import { Circle, Document, G, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer"
import type { Itinerary, VehicleType } from "@/lib/types"
import { CATEGORY_KEYS, translate } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import type { MessageKey } from "@/lib/i18n"
import { getBoundaryLines, graticulePathD, projectPoint, scaleBarFor, territoryPathD, viewportFor } from "@/lib/pdf-territory"
import {
  formatDurationMinutes,
  formatEur,
  formatKm,
  fuelCost,
  tollsCost,
  totalCost,
} from "@/lib/costs"

const BRAND = "#0088ae"
const INK = "#0f172a"
const MUTED = "#47657d"
const HAIRLINE = "#e2e8f0"

const VEHICLE_KEY: Record<VehicleType, MessageKey> = {
  benzina: "vehiclePetrol",
  diesel: "vehicleDiesel",
  elettrica: "vehicleEv",
  camper: "vehicleCamper",
  moto: "vehicleMoto",
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
    lineHeight: 1.5,
  },
  brand: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
    marginTop: 6,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: MUTED,
    lineHeight: 1.3,
    marginTop: 6,
  },
  meta: {
    fontSize: 10,
    color: MUTED,
    marginTop: 8,
  },
  mapBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 6,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 6,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  stat: {
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 6,
    padding: 8,
  },
  statLabel: {
    fontSize: 8,
    color: MUTED,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  micro: {
    fontSize: 9,
    color: MUTED,
    marginTop: 6,
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  lineAmount: {
    fontFamily: "Helvetica-Bold",
  },
  alert: {
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  dayBlock: {
    marginTop: 12,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
    paddingBottom: 4,
    marginBottom: 6,
  },
  dayTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  dayKm: {
    fontSize: 10,
    color: MUTED,
  },
  stopBlock: {
    marginTop: 8,
  },
  stopTime: {
    fontSize: 9,
    color: BRAND,
    fontFamily: "Helvetica-Bold",
  },
  stopName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  stopKind: {
    fontFamily: "Helvetica",
    fontWeight: "normal",
    color: MUTED,
    fontSize: 10,
  },
  stopDesc: {
    marginTop: 2,
  },
  small: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  substopBlock: {
    marginTop: 4,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: HAIRLINE,
  },
  substopName: {
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
  },
})

/**
 * Printable trip document: header + stats, road-only cost summary (same
 * deterministic rows as `CostSummary`), then every day with its visitable
 * stops (drive legs stay hidden, like the timeline), substops, booking
 * searches, and toll alerts.
 */
export function TripPdfDocument({
  itinerary,
  locale,
  totalKm,
  totalStops,
}: {
  itinerary: Itinerary
  locale: Locale
  totalKm: number
  totalStops: number
}) {
  const isRoad = itinerary.mode === "road"
  const isEv = itinerary.vehicle.type === "elettrica"
  const energyUnit = isEv ? "kWh" : "L"
  const tolls = tollsCost(itinerary)
  const computedTotal = totalCost(itinerary)
  const { consumption, fuelPrice } = itinerary.vehicle
  const hasLiveTolls = typeof itinerary.tollTotalEur === "number"
  const hasTollAlerts = !hasLiveTolls && tolls <= 0 && itinerary.tollNotices.length > 0
  const tollRoute = (itinerary.tollCountries ?? []).join(" → ")

  // Black & white route map, road trips only: city walks have no territory
  // context at street scale and no departure point, so the map would be an
  // empty grid with a squiggle. City PDFs skip straight to the day-by-day
  // stops (same as the road-only cost section).
  const MAP_W = 515
  const MAP_H = 190
  const hasOriginPoint =
    isRoad && typeof itinerary.originLat === "number" && typeof itinerary.originLng === "number"
  // Global ordinal over visitable stops only (drive legs are hidden from the
  // timeline, so they get no number — same numbering as the app map pins).
  const stopSeq = new Map<string, number>()
  {
    let seq = 0
    for (const day of itinerary.days) {
      for (const stop of day.stops) {
        if (stop.kind === "drive") continue
        stopSeq.set(stop.id, ++seq)
      }
    }
  }
  const mapPoints: Array<{ lat: number; lng: number; seq: number | null }> = []
  if (hasOriginPoint) {
    mapPoints.push({ lat: itinerary.originLat as number, lng: itinerary.originLng as number, seq: null })
  }
  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      if (stop.kind === "drive") continue
      if (
        typeof stop.lat === "number" &&
        typeof stop.lng === "number" &&
        Number.isFinite(stop.lat) &&
        Number.isFinite(stop.lng)
      ) {
        mapPoints.push({ lat: stop.lat, lng: stop.lng, seq: stopSeq.get(stop.id) ?? null })
      }
    }
  }
  // Road-only map: the 3° default floor keeps the surrounding territory
  // in view. City trips skip the map entirely (see above).
  const viewport = isRoad && mapPoints.length >= 2 ? viewportFor(mapPoints, { width: MAP_W, height: MAP_H, pad: 10 }) : null
  // Route and territory share one projection, so outlines sit exactly
  // behind the stops they surround.
  const projected = viewport
    ? mapPoints.map((p, i) => ({ ...projectPoint(viewport, p), seq: mapPoints[i]?.seq ?? null }))
    : []
  const routePath =
    projected.length >= 2
      ? `M ${projected.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`
      : ""
  const territoryD = viewport ? territoryPathD(getBoundaryLines(), viewport) : ""
  // Graticule + scale bar keep the map readable where no boundary passes
  // (street-scale city viewports): the grid gives orientation, the bar
  // gives distances on paper.
  const graticuleD = viewport ? graticulePathD(viewport) : ""
  const scaleBar = viewport ? scaleBarFor(viewport) : null
  const BAR_X = 8
  const BAR_Y = MAP_H - 10

  return (
    <Document title={itinerary.title} author="PackrOn">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>PACKRON</Text>
        <Text style={styles.title}>{itinerary.title}</Text>
        {itinerary.subtitle ? <Text style={styles.subtitle}>{itinerary.subtitle}</Text> : null}
        <Text style={styles.meta}>
          {itinerary.mode === "road" ? "Road trip" : "City trip"}
          {"  ·  "}
          {translate(locale, itinerary.days.length === 1 ? "dayCount" : "daysCount", {
            n: itinerary.days.length,
          })}
          {"  ·  "}
          {formatKm(totalKm, locale)}
          {"  ·  "}
          {translate(locale, "stopsCount", { n: totalStops })}
          {isRoad ? `  ·  ${translate(locale, VEHICLE_KEY[itinerary.vehicle.type])}` : ""}
        </Text>

        {projected.length >= 2 ? (
          <View style={styles.mapBox}>
              <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
                <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill="#ffffff" />
                {graticuleD ? (
                  <Path d={graticuleD} stroke="#d4d4d4" strokeWidth={0.5} fill="none" />
                ) : null}
                {territoryD ? (
                  <Path d={territoryD} stroke="#a3a3a3" strokeWidth={0.75} fill="none" />
                ) : null}
                <Path d={routePath} stroke="#111111" strokeWidth={2} fill="none" />
              {projected.map((point, index) =>
                point.seq == null ? (
                  <Rect
                    key={`map-origin-${index}`}
                    x={point.x - 5}
                    y={point.y - 5}
                    width={10}
                    height={10}
                    fill="#111111"
                  />
                ) : (
                  <G key={`map-stop-${index}`}>
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={8}
                      fill="#ffffff"
                      stroke="#111111"
                      strokeWidth={1.5}
                    />
                    <Text
                      x={point.x}
                      y={point.y}
                      style={{
                        textAnchor: "middle",
                        dominantBaseline: "central",
                        fontSize: 8,
                        fontFamily: "Helvetica-Bold",
                        fill: "#111111",
                      }}
                    >
                      {String(point.seq)}
                    </Text>
                  </G>
                ),
              )}
                {scaleBar ? (
                  <G key="map-scale">
                    <Rect
                      x={BAR_X}
                      y={BAR_Y}
                      width={Math.min(scaleBar.widthPx, MAP_W - BAR_X * 2)}
                      height={3}
                      fill="#111111"
                    />
                    <Text
                      x={BAR_X}
                      y={BAR_Y - 5}
                      style={{
                        fontSize: 7,
                        fontFamily: "Helvetica",
                        fill: "#525252",
                      }}
                    >
                      {scaleBar.label}
                    </Text>
                  </G>
                ) : null}
            </Svg>
          </View>
        ) : null}

        {isRoad ? (
          <View>
            <Text style={styles.sectionTitle}>{translate(locale, "costTitle")}</Text>
            <View style={styles.statGrid}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>{translate(locale, "costDistance")}</Text>
                <Text style={styles.statValue}>{formatKm(totalKm, locale)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>{translate(locale, "costFuel")}</Text>
                <Text style={styles.statValue}>{formatEur(fuelCost(itinerary), locale)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>{translate(locale, "costTolls")}</Text>
                <Text style={styles.statValue}>
                  {hasTollAlerts ? translate(locale, "seeAlerts") : formatEur(tolls, locale)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>{translate(locale, "costTotal")}</Text>
                <Text style={styles.statValue}>{formatEur(computedTotal, locale)}</Text>
              </View>
            </View>
            <Text style={styles.micro}>
              {translate(locale, isEv ? "fuelEstimateEnergy" : "fuelEstimateFuel", {
                consumption,
                unit: energyUnit,
                price: formatEur(fuelPrice, locale),
              })}
            </Text>
            {hasLiveTolls && !itinerary.tollAvoided && itinerary.tollSource ? (
              <Text style={styles.micro}>
                {tollRoute
                  ? translate(locale, "tollEstimateLive", {
                      route: tollRoute,
                      price: formatEur(tolls, locale),
                      source: itinerary.tollSource,
                    })
                  : translate(locale, "tollEstimateLiveNoRoute", {
                      price: formatEur(tolls, locale),
                      source: itinerary.tollSource,
                    })}
              </Text>
            ) : null}
            {itinerary.tollAvoided ? (
              <Text style={styles.micro}>{translate(locale, "tollAvoided")}</Text>
            ) : null}
            {itinerary.vehicle.fuelPriceCustom ? (
              <Text style={styles.micro}>
                {translate(locale, "fuelPriceCustom", {
                  price: formatEur(fuelPrice, locale),
                  unit: energyUnit,
                })}
              </Text>
            ) : itinerary.vehicle.fuelCountryCode &&
              itinerary.vehicle.fuelPriceSource &&
              !itinerary.vehicle.fuelPriceFallback ? (
              <Text style={styles.micro}>
                {translate(locale, "fuelPriceLive", {
                  country: itinerary.vehicle.fuelCountryCode,
                  price: formatEur(fuelPrice, locale),
                  unit: energyUnit,
                  source: itinerary.vehicle.fuelPriceSource,
                })}
              </Text>
            ) : null}
            {itinerary.tollBreakdown && itinerary.tollBreakdown.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>{translate(locale, "tollBreakdownTitle")}</Text>
                {itinerary.tollBreakdown.map((line, i) => (
                  <View key={`${line.country}-${line.label}-${i}`} style={styles.lineRow}>
                    <Text>
                      {line.kind === "perKm"
                        ? translate(locale, "tollBreakdownPerKm", {
                            country: line.country,
                            km: line.km ?? 0,
                          })
                        : `${line.label} · ${line.country}`}
                    </Text>
                    <Text style={styles.lineAmount}>{formatEur(line.amountEur, locale)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {itinerary.tollNotices.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>{translate(locale, "alerts")}</Text>
                {itinerary.tollNotices.map((n) => (
                  <View key={n.id} style={styles.alert}>
                    <Text>
                      {n.country}: {n.label}
                      {n.cost > 0
                        ? ` · ${translate(locale, "about", { value: formatEur(n.cost, locale) })}`
                        : ""}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {itinerary.days.map((day) => (
          <View key={day.id} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>
                {translate(locale, "itineraryDayLabel", { n: day.dayNumber })} · {day.title}
              </Text>
              <Text style={styles.dayKm}>
                {formatKm(day.distanceKm, locale)}
                {day.drivingTimeMinutes ? ` · ${formatDurationMinutes(day.drivingTimeMinutes)}` : ""}
              </Text>
            </View>
            {day.stops
              .filter((s) => s.kind !== "drive")
              .map((stop) => (
                <View key={stop.id} style={styles.stopBlock} wrap={false}>
                  <Text style={styles.stopTime}>
                    {stop.time}
                    {stop.endTime ? ` – ${stop.endTime}` : ""}
                    {stop.duration ? ` · ${stop.duration}` : ""}
                  </Text>
                  <Text style={styles.stopName}>
                    {stopSeq.get(stop.id) ?? ""}. {stop.name}{" "}
                    <Text style={styles.stopKind}>
                      · {translate(locale, CATEGORY_KEYS[stop.category])}
                    </Text>
                  </Text>
                  <Text style={styles.stopDesc}>{stop.description}</Text>
                  {stop.parking ? <Text style={styles.small}>{stop.parking}</Text> : null}
                  {stop.substops && stop.substops.length > 0 ? (
                    <View style={styles.substopBlock}>
                      <Text style={styles.small}>{translate(locale, "subStopsTitle")}</Text>
                      {stop.substops.map((sub, j) => (
                        <View key={`${sub.name}-${j}`}>
                          <Text style={styles.substopName}>
                            {sub.name}
                            {sub.type ? ` · ${sub.type}` : ""}
                          </Text>
                          {sub.description ? <Text style={styles.small}>{sub.description}</Text> : null}
                          {sub.getYourGuideQuery ? (
                            <Text style={styles.small}>
                              {translate(locale, "pdfTourSearch")}: {sub.getYourGuideQuery}
                            </Text>
                          ) : null}
                          {sub.bookingQuery ? (
                            <Text style={styles.small}>
                              {translate(locale, "pdfBookingSearch")}: {sub.bookingQuery}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {stop.getYourGuideQuery ? (
                    <Text style={styles.small}>
                      {translate(locale, "pdfTourSearch")}: {stop.getYourGuideQuery}
                    </Text>
                  ) : null}
                  {stop.bookingQuery ? (
                    <Text style={styles.small}>
                      {translate(locale, "pdfBookingSearch")}: {stop.bookingQuery}
                    </Text>
                  ) : null}
                </View>
              ))}
          </View>
        ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `PackrOn · ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
