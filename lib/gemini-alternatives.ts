import { Type, type Schema } from "@google/genai"
import type { GeminiStop } from "./gemini-schema"
import type { GeminiStopType } from "./types"
import type { Locale } from "./i18n"
import { formatDurationMinutes } from "./costs"
import type { Stop } from "./types"
import { STOP_TYPE_TO_CATEGORY } from "./map-gemini-itinerary"

export const GEMINI_ALTERNATIVES_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ["alternatives"],
  properties: {
    alternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: [
          "name",
          "type",
          "lat",
          "lng",
          "duration_minutes",
          "short_description",
          "booking_query",
          "getyourguide_query",
        ],
        properties: {
          name: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ["panoramica", "pasto", "museo", "notte"],
          },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          duration_minutes: { type: Type.INTEGER },
          short_description: { type: Type.STRING },
          booking_query: { type: Type.STRING },
          getyourguide_query: { type: Type.STRING },
        },
      },
    },
  },
}

const CATEGORY_TO_TYPE: Record<Stop["category"], GeminiStopType> = {
  panorama: "panoramica",
  food: "pasto",
  cultura: "museo",
  notte: "notte",
  citta: "panoramica",
  natura: "panoramica",
  borgo: "panoramica",
  sosta: "panoramica",
}

export function buildAlternativesPrompt(stop: Stop, locale: Locale): string {
  const type = CATEGORY_TO_TYPE[stop.category]
  const languageLine =
    locale === "en"
      ? "Write every user-facing field in English. Keep official local proper names."
      : "Scrivi ogni campo testuale in italiano. Conserva i nomi propri ufficiali."
  return [
    locale === "en"
      ? "You are an expert travel planner. Suggest 3 real alternative stops near the current one."
      : "Sei un travel planner esperto. Proponi 3 tappe alternative reali vicine a quella attuale.",
    `Current stop: ${stop.name}`,
    `Description: ${stop.description}`,
    `Type: ${type}`,
    `Coordinates: ${stop.lat}, ${stop.lng}`,
    `Preferred duration minutes: ${stop.duration}`,
    "Rules:",
    "- Return exactly 3 alternatives of the same type when realistic.",
    "- Use real places with precise lat/lng within a short distance of the current stop.",
    "- Do not repeat the current stop name.",
    "- For type=notte, name a specific hotel or B&B and set booking_query to that name plus the city.",
    "- For type=pasto, mention local dishes in the description.",
    `- ${languageLine}`,
  ].join("\n")
}

export function mapAlternativeStops(raw: GeminiStop[], current: Stop): Stop[] {
  return raw.slice(0, 3).map((stop, index) => {
    const type = (["panoramica", "pasto", "museo", "notte"].includes(stop.type)
      ? stop.type
      : "panoramica") as GeminiStopType
    const duration = Math.max(15, Number(stop.duration_minutes) || 60)
    return {
      id: `alt-${Date.now().toString(36)}-${index}`,
      name: stop.name,
      description: stop.short_description,
      category: STOP_TYPE_TO_CATEGORY[type],
      time: current.time,
      duration: formatDurationMinutes(duration),
      parking: current.parking,
      lat: Number(stop.lat),
      lng: Number(stop.lng),
      bookingQuery: stop.booking_query?.trim() || stop.name,
      bookingCity: current.bookingCity,
      getYourGuideQuery: stop.getyourguide_query || stop.name,
    }
  })
}

export function isGeminiAlternatives(value: unknown): value is { alternatives: GeminiStop[] } {
  if (!value || typeof value !== "object") return false
  const alts = (value as { alternatives?: unknown }).alternatives
  return Array.isArray(alts) && alts.length > 0
}
