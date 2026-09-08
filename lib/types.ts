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

export type GeminiStopType = "panoramica" | "pasto" | "museo" | "notte"

export interface Stop {
  id: string
  name: string
  description: string
  category: StopCategory
  /** Suggested arrival time, e.g. "09:30" */
  time: string
  /** Recommended visit duration, e.g. "1h 30m" */
  duration: string
  /** Parking hint (road trips) */
  parking?: string
  lat: number
  lng: number
  bookingQuery?: string
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
}

export interface TollNotice {
  id: string
  country: string
  label: string
  /** Estimated cost in EUR */
  cost: number
  kind: "vignette" | "toll"
}

export interface Itinerary {
  mode: TripMode
  title: string
  subtitle: string
  origin: string
  loop: boolean
  vehicle: Vehicle
  days: ItineraryDay[]
  tollNotices: TollNotice[]
  totalKmEstimated?: number
  estimatedFuelCostRange?: string
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
  panoramica: "Panoramica",
  pasto: "Pasto",
  museo: "Museo",
  notte: "Notte",
}
