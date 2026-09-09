import { GoogleGenAI } from "@google/genai"
import { NextResponse } from "next/server"
import { GEMINI_TRIP_SCHEMA, type GeminiTrip } from "@/lib/gemini-schema"
import { buildTripPrompt } from "@/lib/gemini-prompt"
import { isGeminiTrip, mapGeminiTrip } from "@/lib/map-gemini-itinerary"
import type { GenerateTripPayload } from "@/lib/types"
import { translate, type Locale, type MessageKey } from "@/lib/i18n"

export const maxDuration = 60

const MODEL_PRIMARY = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite"
const MODEL_FALLBACK = "gemini-3.1-flash-lite-preview"

function localeOf(payload?: GenerateTripPayload): Locale {
  return payload?.locale === "en" ? "en" : "it"
}

function apiError(locale: Locale, key: MessageKey, status: number) {
  return NextResponse.json({ error: translate(locale, key) }, { status })
}

function parseJsonPayload(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw)
}

async function generateJson(ai: GoogleGenAI, model: string, prompt: string, locale: Locale) {
  return ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction:
        locale === "en"
          ? "The requested output language is English. Every user-facing natural-language field in the JSON must be written in English. Preserve only official local proper names."
          : "La lingua richiesta per l'output è l'italiano. Ogni campo testuale destinato all'utente deve essere scritto in italiano.",
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: GEMINI_TRIP_SCHEMA,
      ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  })
}

export async function POST(request: Request) {
  let payload: GenerateTripPayload | undefined
  try {
    payload = (await request.json()) as GenerateTripPayload
  } catch {
    return apiError("it", "apiBadBody", 400)
  }

  if (!payload) {
    return apiError("it", "apiBadBody", 400)
  }

  const locale = localeOf(payload)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
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

  try {
    const ai = new GoogleGenAI({ apiKey })
    let response
    try {
      response = await generateJson(ai, MODEL_PRIMARY, buildTripPrompt(payload), locale)
    } catch (primaryError) {
      if (MODEL_PRIMARY === MODEL_FALLBACK) throw primaryError
      response = await generateJson(ai, MODEL_FALLBACK, buildTripPrompt(payload), locale)
    }

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
    const message = error instanceof Error ? error.message : translate(locale, "apiGeneric")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
