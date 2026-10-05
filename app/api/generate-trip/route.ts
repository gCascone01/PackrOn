import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { generateJsonWithFallback, parseJsonPayload } from "@/lib/gemini"
import { GEMINI_TRIP_SCHEMA, type GeminiTrip } from "@/lib/gemini-schema"
import { buildTripPrompt } from "@/lib/gemini-prompt"
import { isGeminiTrip, mapGeminiTrip } from "@/lib/map-gemini-itinerary"
import type { GenerateTripPayload } from "@/lib/types"
import { translate, type Locale, type MessageKey } from "@/lib/i18n"
import { validateLocations } from "@/lib/geocode"
import { getEnergyPrice } from "@/lib/energy-prices"
import { buildTollWaypoints, getRouteTolls, vehicleClassForTolls } from "@/lib/tolls"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { isMissingTableError } from "@/lib/trips"
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

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: translate(locale, "apiGeneric") }, { status: 503 })
  }

  const validation = await validateLocations(payload, locale)
  if (!validation.valid) {
    return apiError(locale, validation.errorKey!, 400)
  }

  // The energy lookup starts before generation so its latency hides inside
  // the slow Gemini call. The toll lookup runs after mapping instead: it
  // routes through the itinerary's own stop coordinates, which never fail
  // geocoding — unlike free-text names or flowery day titles, either of
  // which 422s the whole toll request. Both never throw.
  const energyPromise = getEnergyPrice(validation.countryCode, payload.vehicle ?? "diesel")

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

    // Country-dependent live energy price (fuel or household electricity
    // for EVs). Never blocks generation: falls back to built-in defaults.
    const energy = await energyPromise
    const itinerary = mapGeminiTrip(parsed as GeminiTrip, payload, {
      priceEur: energy.priceEur,
      countryCode: energy.countryCode ?? undefined,
      source: energy.source,
      fallback: energy.fallback,
    })
    if (payload.mode === "road") {
      if (payload.avoidTolls) {
        // The route is planned to avoid toll roads — €0 by choice, not by
        // missing data. Gemini alerts still list anything unavoidable.
        itinerary.tollAvoided = true
        itinerary.tollTotalEur = 0
      } else {
        const waypoints = buildTollWaypoints({
          origin:
            itinerary.originLat != null && itinerary.originLng != null
              ? { lat: itinerary.originLat, lng: itinerary.originLng }
              : null,
          originName: payload.origin,
          destinationName: payload.destination,
          days: itinerary.days,
          loop: payload.loop ?? false,
        })
        const tolls = await getRouteTolls(
          waypoints,
          vehicleClassForTolls(payload.vehicle ?? "diesel"),
        )
        if (tolls) {
          itinerary.tollTotalEur = tolls.totalEur
          itinerary.tollCountries = tolls.countries
          itinerary.tollSource = tolls.source
          itinerary.tollBreakdown = tolls.lines
        } else {
          console.warn("[generate-trip] toll lookup returned no estimate", {
            waypointCount: waypoints.length,
          })
        }
      }
    }
    if (debugEnabled) logGeminiMappedItinerary(itinerary, parsed as GeminiTrip)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const id = randomUUID()
    const { error } = await supabase
      .from("saved_trips")
      .insert({
        id,
        user_id: user?.id ?? null,
        title: itinerary.title.trim().slice(0, 160),
        mode: itinerary.mode,
        origin: itinerary.origin.slice(0, 200),
        data: itinerary,
      })

    if (error) {
      console.error("[generate-trip] trip persistence failed:", error)
      return NextResponse.json(
        { error: translate(locale, "apiGeneric"), ...(error && isMissingTableError(error) ? { code: "setup_required" } : {}) },
        { status: 500 },
      )
    }

    return NextResponse.json({ id })
  } catch (error) {
    const message = error instanceof Error && error.message !== "MISSING_KEY"
      ? error.message
      : translate(locale, error instanceof Error && error.message === "MISSING_KEY" ? "apiMissingKey" : "apiGeneric")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}