import type { Itinerary, TripMode } from "./types"
import { isItinerary } from "./share"

/** Row shape of the `saved_trips` table (RLS: owner-only). */
export interface SavedTrip {
  id: string
  user_id: string
  title: string
  mode: TripMode
  origin: string
  data: Itinerary
  created_at: string
  updated_at: string
}

/** Lightweight list item (without the full itinerary JSON). */
export interface SavedTripSummary {
  id: string
  title: string
  mode: TripMode
  origin: string
  created_at: string
  updated_at: string
  days_count: number
  stops_count: number
}

export const MAX_SAVED_TRIP_BYTES = 500_000
export const MAX_SAVED_TITLE_LENGTH = 160

function countStops(itinerary: Itinerary): number {
  return itinerary.days.reduce((n, d) => n + d.stops.length, 0)
}

export function toSavedTripSummary(row: SavedTrip): SavedTripSummary {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    origin: row.origin,
    created_at: row.created_at,
    updated_at: row.updated_at,
    days_count: row.data.days.length,
    stops_count: countStops(row.data),
  }
}

/**
 * Detects a "table does not exist" Supabase/PostgREST error — i.e. the
 * `saved_trips` migration was never run. Routes map this to a 503 with the
 * machine-readable `setup_required` code so the UI can tell the user exactly
 * what to do instead of showing a generic failure.
 */
export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { code?: unknown; message?: unknown }
  if (e.code === "PGRST205" || e.code === "42P01") return true
  if (typeof e.message === "string") {
    const m = e.message.toLowerCase()
    return m.includes("saved_trips") && (m.includes("schema cache") || m.includes("does not exist"))
  }
  return false
}

/**
 * Server-side validation for a save-trip payload.
 * Returns a localized error key-free message (route maps it to i18n).
 */
export function validateSaveTripPayload(body: unknown): { itinerary: Itinerary } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid JSON body." }
  const itinerary = (body as { itinerary?: unknown }).itinerary ?? body
  if (!isItinerary(itinerary)) return { error: "Invalid itinerary." }
  if (typeof itinerary.title !== "string" || itinerary.title.trim().length === 0) {
    return { error: "Invalid itinerary." }
  }
  if (itinerary.title.length > MAX_SAVED_TITLE_LENGTH) return { error: "Title too long." }
  let size = 0
  try {
    size = JSON.stringify(itinerary).length
  } catch {
    return { error: "Invalid itinerary." }
  }
  if (size > MAX_SAVED_TRIP_BYTES) return { error: "Itinerary too large." }
  return { itinerary }
}
