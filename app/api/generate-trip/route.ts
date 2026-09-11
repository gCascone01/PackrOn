import { NextResponse } from "next/server"
import { generateJsonWithFallback, parseJsonPayload } from "@/lib/gemini"
import { GEMINI_TRIP_SCHEMA, type GeminiTrip } from "@/lib/gemini-schema"
import { buildTripPrompt } from "@/lib/gemini-prompt"
import { isGeminiTrip, mapGeminiTrip } from "@/lib/map-gemini-itinerary"
import type { GenerateTripPayload } from "@/lib/types"
import { translate, type Locale, type MessageKey } from "@/lib/i18n"
import { validateLocations } from "@/lib/geocode"

export const maxDuration = 60

function localeOf(payload?: GenerateTripPayload): Locale {
  return payload?.locale === "it" ? "it" : "en"
}

function apiError(locale: Locale, key: MessageKey, status: number) {
  return NextResponse.json({ error: translate(locale, key) }, { status })
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

  try {
    const response = await generateJsonWithFallback(buildTripPrompt(payload), locale, GEMINI_TRIP_SCHEMA)
    const text = response.text
    if (!text) {
      return apiError(locale, "apiEmpty", 502)
    }

    const parsed = parseJsonPayload(text)
    
    // Check if Gemini detected an impossible trip
    if (parsed && typeof parsed === "object" && "impossible_trip" in parsed && (parsed as Record<string, unknown>).impossible_trip === true) {
      const reason = ((parsed as Record<string, unknown>).reason as string) || (locale === "it" ? "Viaggio non fattibile in auto" : "Trip not feasible by car")
      return NextResponse.json({ error: reason }, { status: 400 })
    }
    
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