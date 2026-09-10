import type { Itinerary } from "./types"
import type { Locale } from "./i18n"

function bcp47(locale: Locale = "en") {
  return locale === "en" ? "en-GB" : "it-IT"
}

export function totalDistanceKm(itinerary: Itinerary): number {
  if (itinerary.totalKmEstimated && itinerary.totalKmEstimated > 0) {
    return itinerary.totalKmEstimated
  }
  return itinerary.days.reduce((sum, day) => sum + day.distanceKm, 0)
}

/**
 * Deterministic fuel estimate:
 * (Km totali / 100) * Consumo * Prezzo medio carburante
 */
export function fuelCost(itinerary: Itinerary): number {
  const km = totalDistanceKm(itinerary)
  const { consumption, fuelPrice } = itinerary.vehicle
  return (km / 100) * consumption * fuelPrice
}

export function tollsCost(itinerary: Itinerary): number {
  return itinerary.tollNotices.reduce((sum, t) => sum + t.cost, 0)
}

export function totalCost(itinerary: Itinerary): number {
  return fuelCost(itinerary) + tollsCost(itinerary)
}

export function formatEur(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(bcp47(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatKm(value: number, locale: Locale = "en"): string {
  return `${new Intl.NumberFormat(bcp47(locale)).format(Math.round(value))} km`
}

export function formatDurationMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  if (safe === 0) return "—"
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}
