import { NextResponse } from "next/server"
import { generateJsonWithFallback, parseJsonPayload } from "@/lib/gemini"
import { GEMINI_DESCRIBE_STOP_SCHEMA, isGeminiDescribeStop, type GeminiDescribeStop } from "@/lib/gemini-describe-stop"
import { buildDescribeStopPrompt } from "@/lib/gemini-describe-stop"
import { fetchStopImage } from "@/lib/stop-image"
import { isLocale, translate, type Locale } from "@/lib/i18n"
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
    return NextResponse.json({ error: translate("en", "apiBadBody") }, { status: 400 })
  }

  const locale: Locale = isLocale(body.locale) ? body.locale : "en"
  if (!isStop(body.stop)) {
    return NextResponse.json({ error: translate(locale, "apiBadBody") }, { status: 400 })
  }

  const stop = body.stop as Stop

  const [description, image] = await Promise.all([
    loadDescription(stop, locale),
    fetchStopImage(stop.name, stop.lat, stop.lng, locale),
  ])
  return NextResponse.json({ description, image })
}

async function loadDescription(stop: Stop, locale: Locale): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return translate(locale, "descriptionUnavailable")
  }

  try {
    const response = await generateJsonWithFallback(
      buildDescribeStopPrompt(stop, locale),
      locale,
      GEMINI_DESCRIBE_STOP_SCHEMA,
    )
    const text = response.text
    if (!text) {
      return translate(locale, "descriptionUnavailable")
    }
    const parsed = parseJsonPayload(text)
    if (!isGeminiDescribeStop(parsed)) {
      return translate(locale, "descriptionUnavailable")
    }
    return parsed.description
  } catch {
    return translate(locale, "descriptionUnavailable")
  }
}
