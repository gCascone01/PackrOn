import type { GeminiTrip } from "./gemini-schema"
import type {
  GenerateTripPayload,
  GeminiStopType,
  Itinerary,
  ItineraryDay,
  Stop,
  StopCategory,
  Vehicle,
  VehicleType,
} from "./types"
import { formatDurationMinutes } from "./costs"
import { translate } from "./i18n"

export const STOP_TYPE_TO_CATEGORY: Record<GeminiStopType, StopCategory> = {
  drive: "sosta",
  breakfast: "food",
  panoramica: "panorama",
  pasto: "food",
  museo: "cultura",
  notte: "notte",
}

const VEHICLE_FROM_LABEL: Record<string, VehicleType> = {
  benzina: "benzina",
  diesel: "diesel",
  elettrica: "elettrica",
  camper: "camper",
  moto: "moto",
  Benzina: "benzina",
  Diesel: "diesel",
  Elettrica: "elettrica",
  "Camper/Van": "camper",
  Moto: "moto",
  Petrol: "benzina",
  Electric: "elettrica",
  Motorcycle: "moto",
}

/** Built-in fallback prices (EUR/L or EUR/kWh) when live APIs are unreachable. */
export const DEFAULT_FUEL_PRICE: Record<VehicleType, number> = {
  benzina: 1.8,
  diesel: 1.72,
  elettrica: 0.4,
  camper: 1.85,
  moto: 1.8,
}

/**
 * Negative toll alerts ("No vignettes for passenger cars", "No tolls on
 * this route") state the absence of an action — they are noise, not advice,
 * now that real charges appear as priced breakdown lines. Drop them, but
 * keep any alert that also names a price ("No vignette, but the tunnel
 * costs €9"), since that half is actionable.
 */
const NEGATIVE_TOLL_PATTERNS = [
  /no vignettes?/i,
  /no tolls?/i,
  /not required/i,
  /nessuna vignetta/i,
  /nessun pedaggio/i,
  /non (è|e') richiest[aoie]/i,
  /non sono richiest[ei]/i,
]

const TOLL_PRICE_HINT = /€|\beur\b|\bchf\b|\bcost\b|\bprice\b|\bpay\b|£|\$|\bczk\b|\bhuf\b|\bpln\b|\bron\b|\bsek\b|\bnok\b|\bdkk\b/i

export function isActionableTollAlert(label: string): boolean {
  const text = (label ?? "").trim()
  if (!text) return false
  if (!NEGATIVE_TOLL_PATTERNS.some((re) => re.test(text))) return true
  return TOLL_PRICE_HINT.test(text)
}

let idCounter = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

function padTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function vehicleFromPayload(
  payload: GenerateTripPayload,
  priceOverride?: { priceEur: number; countryCode?: string; source?: string; fallback?: boolean },
): Vehicle {
  const type = VEHICLE_FROM_LABEL[payload.vehicle ?? ""] ?? "diesel"
  if (priceOverride && Number.isFinite(priceOverride.priceEur) && priceOverride.priceEur > 0) {
    return {
      type,
      consumption: Number.isFinite(payload.consumption) ? Number(payload.consumption) : type === "elettrica" ? 18 : 6.5,
      fuelPrice: priceOverride.priceEur,
      ...(priceOverride.countryCode ? { fuelCountryCode: priceOverride.countryCode } : {}),
      ...(priceOverride.source ? { fuelPriceSource: priceOverride.source } : {}),
      ...(priceOverride.fallback != null ? { fuelPriceFallback: priceOverride.fallback } : {}),
    }
  }
  return {
    type,
    consumption: Number.isFinite(payload.consumption) ? Number(payload.consumption) : type === "elettrica" ? 18 : 6.5,
    fuelPrice: DEFAULT_FUEL_PRICE[type],
    fuelPriceFallback: true,
  }
}

export function isGeminiTrip(value: unknown): value is GeminiTrip {
  if (!value || typeof value !== "object") return false
  const trip = value as Record<string, unknown>
  // An impossible-trip flag must never be treated as a displayable trip,
  // even when the model also fills the required trip fields (schema forces them).
  if (trip.impossible_trip === true) return false
  return (
    typeof trip.trip_title === "string" &&
    typeof trip.summary === "string" &&
    (typeof trip.total_km_estimated === "number" || typeof trip.total_km_estimated === "string") &&
    typeof trip.estimated_fuel_cost_range === "string" &&
    Array.isArray(trip.toll_and_vignette_alerts) &&
    Array.isArray(trip.days) &&
    trip.days.length > 0
  )
}

export function mapGeminiTrip(
  raw: GeminiTrip,
  payload: GenerateTripPayload,
  priceOverride?: { priceEur: number; countryCode?: string; source?: string; fallback?: boolean },
): Itinerary {
  idCounter = 0
  const origin = payload.mode === "city" ? (payload.city ?? "") : (payload.origin ?? "")
  const dayCount = raw.days.length || 1
  const kmPerDay = raw.total_km_estimated > 0 ? raw.total_km_estimated / dayCount : 0

  const days: ItineraryDay[] = raw.days.map((day) => {
    const stops: Stop[] = (day.stops ?? []).map((stop) => {
      const type = (["drive", "breakfast", "panoramica", "pasto", "museo", "notte"].includes(stop.type)
        ? stop.type
        : "panoramica") as GeminiStopType
      const durationMinutes = Number(stop.duration_minutes)
      const bookingCity = payload.mode === "city" ? payload.city?.trim() : day.title.trim()
      const lodgingSearch = bookingCity && !stop.name.toLowerCase().includes(bookingCity.toLowerCase())
        ? `${stop.name} ${bookingCity}`
        : stop.name
      const mapped: Stop = {
        id: uid("stop"),
        name: stop.name,
        description: stop.short_description,
        category: STOP_TYPE_TO_CATEGORY[type],
        kind: type,
        time: stop.start_time,
        endTime: stop.end_time,
        duration: Number.isFinite(durationMinutes) && durationMinutes > 0
          ? formatDurationMinutes(durationMinutes)
          : undefined,
        parking: payload.mode === "road" ? translate(payload.locale === "it" ? "it" : "en", "parkingHint") : undefined,
        lat: typeof stop.lat === "number" ? stop.lat : null,
        lng: typeof stop.lng === "number" ? stop.lng : null,
        substops: (stop.sub_stops ?? []).map((substop) => ({
          name: substop.name,
          type: substop.type,
          description: substop.description,
          bookingUrl: substop.booking_url,
          bookingQuery: substop.booking_query?.trim() || undefined,
          getYourGuideQuery: substop.getyourguide_query?.trim() || undefined,
        })),
        bookingQuery: stop.booking_query?.trim() || (type === "notte" ? lodgingSearch : undefined),
        bookingCity,
        getYourGuideQuery: stop.getyourguide_query?.trim() || undefined,
      }
      return mapped
    })

    return {
      id: uid("day"),
      dayNumber: Number(day.day_number) || 0,
      title: day.title,
      distanceKm: 0,
      drivingTimeMinutes: Math.max(0, Number(day.driving_time_minutes) || 0),
      stops,
    }
  })

  return {
    mode: payload.mode,
    title: raw.trip_title,
    subtitle: raw.summary,
    origin,
    originLat: raw.origin_lat,
    originLng: raw.origin_lng,
    loop: payload.loop ?? false,
    vehicle: vehicleFromPayload(payload, priceOverride),
    days,
    tollNotices: (raw.toll_and_vignette_alerts ?? [])
      .filter((label) => isActionableTollAlert(label))
      .map((label, i) => ({
        id: `toll-${i}`,
        country: translate(payload.locale === "it" ? "it" : "en", "notice"),
        label,
        cost: 0,
        kind: /vignett|bollin/i.test(label) ? "vignette" : "toll",
      })),
    totalKmEstimated: Number(raw.total_km_estimated) || kmPerDay * dayCount,
    estimatedFuelCostRange: raw.estimated_fuel_cost_range,
  }
}
