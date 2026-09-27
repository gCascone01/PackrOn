import { NextResponse } from "next/server"
import { generateJsonWithFallback, parseJsonPayload } from "@/lib/gemini"
import { GEMINI_TRIP_SCHEMA, type GeminiTrip } from "@/lib/gemini-schema"
import { buildTripPrompt } from "@/lib/gemini-prompt"
import { isGeminiTrip, mapGeminiTrip } from "@/lib/map-gemini-itinerary"
import type { GenerateTripPayload } from "@/lib/types"
import { translate, type Locale, type MessageKey } from "@/lib/i18n"
import { validateLocations } from "@/lib/geocode"
import {
  createGeminiDebugId,
  isGeminiDebugEnabled,
  logGeminiDebugStart,
  logGeminiMappedItinerary,
  logGeminiParsedJson,
  logGeminiRawResponse,
} from "@/lib/gemini-debug"

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
    const prompt = buildTripPrompt(payload)
    const debugEnabled = isGeminiDebugEnabled()
    const debugId = debugEnabled ? createGeminiDebugId() : null
    if (debugId) logGeminiDebugStart(debugId, prompt)

    const response = await generateJsonWithFallback(prompt, locale, GEMINI_TRIP_SCHEMA)
    const text = response.text
    if (!text) {
      return apiError(locale, "apiEmpty", 502)
    }
    if (debugEnabled) logGeminiRawResponse(text)

    const parsed = parseJsonPayload(text)
    if (debugEnabled) logGeminiParsedJson(parsed)
    
    // Check if Gemini detected an impossible trip
    if (parsed && typeof parsed === "object" && "impossible_trip" in parsed && (parsed as Record<string, unknown>).impossible_trip === true) {
      const record = parsed as Record<string, unknown>
      const reason = (record.reason as string) || translate(locale, "apiGeneric")
      // Prefer a stable localized message for the title (the UI matches error
      // categories by keyword, which is unreliable on Gemini's free-text
      // reason) and keep the reason as detail.
      const code = typeof record.error_code === "string" ? record.error_code : ""
      const key = {
        invalid_city: "apiInvalidCity",
        invalid_origin: "apiInvalidOrigin",
        invalid_destination: "apiInvalidDestination",
        too_far: "apiTooFar",
        impossible: "apiImpossibleTrip",
      }[code] as MessageKey | undefined
      if (!key) {
        return NextResponse.json({ error: reason }, { status: 400 })
      }
      return NextResponse.json({ error: `${translate(locale, key)} ${reason}` }, { status: 400 })
    }
    
    if (!isGeminiTrip(parsed)) {
      return apiError(locale, "apiBadSchema", 502)
    }

    const itinerary = mapGeminiTrip(parsed as GeminiTrip, payload)
  if (debugEnabled) logGeminiMappedItinerary(itinerary, parsed as GeminiTrip)
    return NextResponse.json({ itinerary })
  } catch (error) {
    const message = error instanceof Error && error.message !== "MISSING_KEY"
      ? error.message
      : translate(locale, error instanceof Error && error.message === "MISSING_KEY" ? "apiMissingKey" : "apiGeneric")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}