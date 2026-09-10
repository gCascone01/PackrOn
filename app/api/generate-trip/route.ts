import { NextResponse } from "next/server"
import { generateJsonWithFallback, parseJsonPayload } from "@/lib/gemini"
import { GEMINI_TRIP_SCHEMA, type GeminiTrip } from "@/lib/gemini-schema"
import { buildTripPrompt } from "@/lib/gemini-prompt"
import { isGeminiTrip, mapGeminiTrip } from "@/lib/map-gemini-itinerary"
import type { GenerateTripPayload } from "@/lib/types"
import { translate, type Locale, type MessageKey } from "@/lib/i18n"
import { geocodeLocation, validateLocations } from "@/lib/geocode"
import { haversineKm } from "@/lib/geo"

export const maxDuration = 60

const MAX_ROAD_TRIP_KM = 5000

function localeOf(payload?: GenerateTripPayload): Locale {
  return payload?.locale === "it" ? "it" : "en"
}

function apiError(locale: Locale, key: MessageKey, status: number) {
  return NextResponse.json({ error: translate(locale, key) }, { status })
}

function isIntercontinental(lat1: number, lng1: number, lat2: number, lng2: number): boolean {
  const distance = haversineKm({ lat: lat1, lng: lng1 } as any, { lat: lat2, lng: lng2 } as any)
  return distance > MAX_ROAD_TRIP_KM
}

export async function POST(request: Request) {
  let payload: GenerateTripPayload | undefined
  try {
    payload = (await request.json()) as GenerateTripPayload
  } catch {
    return apiError("en", "apiBadBody", 400)
  }

  const locale = localeOf(payload)

  if (!payload) {
    return apiError(locale, "apiBadBody", 400)
  }

  if (!process.env.GEMINI_API_KEY) {
    return apiError(locale, "apiMissingKey", 500)
  }

  if (payload.mode !== "road" && payload.mode !== "city") {
    return apiError(locale, "apiBadMode", 400)
  }

  if (payload.mode === "city" && !payload.city?.trim()) {
    return apiError(locale, "apiNeedCity", 400)
  }

  if (payload.mode === "road" && (!payload.origin?.trim() || !payload.destination?.trim())) {
    return apiError(locale, "apiNeedRoute", 400)
  }

  const validation = await validateLocations(payload, locale)
  if (!validation.valid) {
    return apiError(locale, validation.errorKey!, 400)
  }

  if (payload.mode === "road" && validation.coords?.originLat && validation.coords?.originLng && validation.coords?.destLat && validation.coords?.destLng) {
    if (isIntercontinental(validation.coords.originLat, validation.coords.originLng, validation.coords.destLat, validation.coords.destLng)) {
      return apiError(locale, "apiImpossibleTrip", 400)
    }
  }

  try {
    const response = await generateJsonWithFallback(buildTripPrompt(payload), locale, GEMINI_TRIP_SCHEMA)
    const text = response.text
    if (!text) {
      return apiError(locale, "apiEmpty", 502)
    }

    const parsed = parseJsonPayload(text)
    if (!isGeminiTrip(parsed)) {
      return apiError(locale, "apiBadSchema", 502)
    }

    const itinerary = mapGeminiTrip(parsed as GeminiTrip, payload)
    return NextResponse.json({ itinerary })
  } catch (error) {
    const message = error instanceof Error && error.message !== "MISSING_KEY"
      ? error.message
      : translate(locale, error instanceof Error && error.message === "MISSING_KEY" ? "apiMissingKey" : "apiGeneric")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}