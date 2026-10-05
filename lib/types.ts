export type TripMode = "road" | "city"

export type StopCategory =
  | "citta"
  | "natura"
  | "borgo"
  | "panorama"
  | "food"
  | "cultura"
  | "sosta"
  | "notte"

export type VehicleType = "benzina" | "diesel" | "elettrica" | "camper" | "moto"

export type GeminiStopType = "drive" | "breakfast" | "panoramica" | "pasto" | "museo" | "notte"

export interface StopSubstop {
  name: string
  type?: string
  description?: string
  bookingUrl?: string
  bookingQuery?: string
  getYourGuideQuery?: string
}

export interface Stop {
  id: string
  name: string
  description: string
  category: StopCategory
  /** Suggested arrival time, e.g. "09:30" */
  time: string
  /** Recommended visit duration, e.g. "1h 30m" */
  duration?: string
  /** Explicit scheduled end time supplied by itinerary generation. */
  endTime?: string
  /** Parking hint (road trips) */
  parking?: string
  lat: number | null
  lng: number | null
  kind?: GeminiStopType
  substops?: StopSubstop[]
  bookingQuery?: string
  bookingCity?: string
  getYourGuideQuery?: string
}

export interface ItineraryDay {
  id: string
  dayNumber: number
  title: string
  /** Driving distance for the day in km */
  distanceKm: number
  drivingTimeMinutes?: number
  stops: Stop[]
}

export interface Vehicle {
  type: VehicleType
  /** Average consumption L/100km (or kWh/100km for EV) */
  consumption: number
  /** Fuel price per liter (or per kWh) in EUR */
  fuelPrice: number
  /** ISO 3166-1 alpha-2 country the price applies to (when live). */
  fuelCountryCode?: string
  /** Provenance label for the price (e.g. "OpenVan · EU Oil Bulletin"). */
  fuelPriceSource?: string
  /** True when fuelPrice is the built-in fallback, not a live API value. */
  fuelPriceFallback?: boolean
}

export interface TollNotice {
  id: string
  country: string
  label: string
  /** Estimated cost in EUR */
  cost: number
  kind: "vignette" | "toll"
}

/** One priced component of the live toll total (OpenVan route item). */
export interface TollBreakdownLine {
  /** `perKm`: aggregated gated motorways of one country; `charge`: tunnel/gate/ferry/vignette. */
  kind: "perKm" | "charge"
  country: string
  /** Display label (API English, e.g. "Mont Blanc Tunnel", "Vignette · 1-day"). */
  label: string
  /** Tolled km, for `perKm` lines only. */
  km: number | null
  amountEur: number
}

export interface Itinerary {
  mode: TripMode
  title: string
  subtitle: string
  origin: string
  originLat?: number
  originLng?: number
  loop: boolean
  vehicle: Vehicle
  days: ItineraryDay[]
  tollNotices: TollNotice[]
  totalKmEstimated?: number
  estimatedFuelCostRange?: string
  /** Live motorway toll total in EUR (OpenVan route estimate). Absent = unknown. */
  tollTotalEur?: number
  /** ISO country codes the toll estimate covers, e.g. ["IT", "FR"]. */
  tollCountries?: string[]
  /** Provenance label for the toll estimate (e.g. "OpenVan"). */
  tollSource?: string
  /** Priced components behind `tollTotalEur` — the receipt for the total. */
  tollBreakdown?: TollBreakdownLine[]
  /** True when the user asked to avoid toll roads (estimate is €0 by choice). */
  tollAvoided?: boolean
}

export interface GenerateTripPayload {
  mode: TripMode
  origin?: string
  destination?: string
  city?: string
  days: number
  pace: string
  routeTags?: string[]
  loop?: boolean
  basecamp?: boolean
  crew?: string[]
  vehicle?: string
  consumption?: number
  avoidTolls?: boolean
  interests?: string[]
  notes?: string
  locale?: "it" | "en"
}

export const CATEGORY_LABELS: Record<StopCategory, string> = {
  citta: "Città",
  natura: "Natura",
  borgo: "Borgo",
  panorama: "Panorama",
  food: "Food",
  cultura: "Cultura",
  sosta: "Sosta",
  notte: "Pernotto",
}

export const GEMINI_STOP_LABELS: Record<GeminiStopType, string> = {
  drive: "Guida",
  breakfast: "Colazione",
  panoramica: "Panoramica",
  pasto: "Pasto",
  museo: "Museo",
  notte: "Notte",
}
