import { NextResponse } from "next/server"
import { generateJsonWithFallback, parseJsonPayload } from "@/lib/gemini"
import {
  buildAlternativesPrompt,
  GEMINI_ALTERNATIVES_SCHEMA,
  isGeminiAlternatives,
  mapAlternativeStops,
} from "@/lib/gemini-alternatives"
import { isLocale, translate, type Locale } from "@/lib/i18n"
import { getAlternatives } from "@/lib/mock-itinerary"
import type { Stop } from "@/lib/types"

export const maxDuration = 30

function isStop(value: unknown): value is Stop {
  if (!value || typeof value !== "object") return false
  const stop = value as Stop
  return typeof stop.name === "string" && typeof stop.lat === "number" && typeof stop.lng === "number"
}

export async function POST(request: Request) {
  let body: { stop?: unknown; locale?: unknown }
  try {
    body = (await request.json()) as { stop?: unknown; locale?: unknown }
  } catch {
    return NextResponse.json({ error: translate("it", "apiBadBody") }, { status: 400 })
  }

  const locale: Locale = isLocale(body.locale) ? body.locale : "it"
  if (!isStop(body.stop)) {
    return NextResponse.json({ error: translate(locale, "apiBadBody") }, { status: 400 })
  }

  const fallback = () => NextResponse.json({ alternatives: getAlternatives(body.stop as Stop, locale), fallback: true })

  if (!process.env.GEMINI_API_KEY) {
    return fallback()
  }

  try {
    const response = await generateJsonWithFallback(
      buildAlternativesPrompt(body.stop, locale),
      locale,
      GEMINI_ALTERNATIVES_SCHEMA,
    )
    const text = response.text
    if (!text) return fallback()
    const parsed = parseJsonPayload(text)
    if (!isGeminiAlternatives(parsed)) return fallback()
    const alternatives = mapAlternativeStops(parsed.alternatives, body.stop)
    if (alternatives.length === 0) return fallback()
    return NextResponse.json({ alternatives, fallback: false })
  } catch {
    return fallback()
  }
}
