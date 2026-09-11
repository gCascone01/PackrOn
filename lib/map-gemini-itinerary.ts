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

const DEFAULT_FUEL_PRICE: Record<VehicleType, number> = {
  benzina: 1.8,
  diesel: 1.72,
  elettrica: 0.4,
  camper: 1.85,
  moto: 1.8,
}

let idCounter = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

function padTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function vehicleFromPayload(payload: GenerateTripPayload): Vehicle {
  const type = VEHICLE_FROM_LABEL[payload.vehicle ?? ""] ?? "diesel"
  return {
    type,
    consumption: Number.isFinite(payload.consumption) ? Number(payload.consumption) : type === "elettrica" ? 18 : 6.5,
    fuelPrice: DEFAULT_FUEL_PRICE[type],
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

export function mapGeminiTrip(raw: GeminiTrip, payload: GenerateTripPayload): Itinerary {
  idCounter = 0
  const origin = payload.mode === "city" ? (payload.city ?? "") : (payload.origin ?? "")
  const dayCount = raw.days.length || 1
  const kmPerDay = raw.total_km_estimated > 0 ? raw.total_km_estimated / dayCount : 0

  const days: ItineraryDay[] = raw.days.map((day) => {
    let clock = 9 * 60
    const stops: Stop[] = (day.stops ?? []).map((stop) => {
      const type = (["panoramica", "pasto", "museo", "notte"].includes(stop.type)
        ? stop.type
        : "panoramica") as GeminiStopType
      const duration = Math.max(15, Number(stop.duration_minutes) || 60)
      const mapped: Stop = {
        id: uid("stop"),
        name: stop.name,
        description: stop.short_description,
        category: STOP_TYPE_TO_CATEGORY[type],
        time: padTime(clock),
        duration: formatDurationMinutes(duration),
        parking: payload.mode === "road" ? translate(payload.locale === "it" ? "it" : "en", "parkingHint") : undefined,
        lat: Number(stop.lat),
        lng: Number(stop.lng),
        bookingQuery: stop.booking_query?.trim() || stop.name,
        bookingCity: payload.mode === "city" ? payload.city?.trim() : day.title.trim(),
        getYourGuideQuery: stop.getyourguide_query || stop.name,
      }
      clock += duration + 20
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
    vehicle: vehicleFromPayload(payload),
    days,
    tollNotices: (raw.toll_and_vignette_alerts ?? []).map((label, i) => ({
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
