import { Type, type Schema } from "@google/genai"
import type { Stop } from "./types"
import type { Locale } from "./i18n"

export const GEMINI_DESCRIBE_STOP_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ["description"],
  properties: {
    description: { type: Type.STRING },
  },
}

export function buildDescribeStopPrompt(stop: Stop, locale: Locale): string {
  const languageLine =
    locale === "en"
      ? "Write the description in English. Keep official local proper names."
      : "Scrivi la descrizione in italiano. Conserva i nomi propri ufficiali."

  const categoryLabels: Record<Stop["category"], string> = locale === "en"
    ? {
        citta: "city",
        natura: "nature area",
        borgo: "village",
        panorama: "viewpoint",
        food: "restaurant/food spot",
        cultura: "cultural site",
        sosta: "break stop",
        notte: "overnight stay",
      }
    : {
        citta: "città",
        natura: "area naturale",
        borgo: "borgo",
        panorama: "panorama",
        food: "ristorante/luogo food",
        cultura: "sito culturale",
        sosta: "sosta",
        notte: "pernottamento",
      }

  const categoryLabel = categoryLabels[stop.category] || "location"

  return [
    locale === "en"
      ? "You are an expert travel guide. Write a detailed, engaging description of a travel stop."
      : "Sei una guida turistica esperta. Scrivi una descrizione dettagliata e coinvolgente di una tappa di viaggio.",
    `Stop name: ${stop.name}`,
    `Type: ${categoryLabel}`,
    `Short description: ${stop.description}`,
    `Coordinates: ${stop.lat}, ${stop.lng}`,
    `Address/area context: ${stop.bookingCity || "unknown"}`,
    "Rules:",
    "- Write 3-5 sentences.",
    "- Include historical/cultural context, what makes it special, practical tips.",
    "- Tone: knowledgeable, inviting, concise.",
    "- Do not repeat the short description verbatim.",
    `- ${languageLine}`,
  ].join("\n")
}

export function isGeminiDescribeStop(value: unknown): value is { description: string } {
  if (!value || typeof value !== "object") return false
  const desc = (value as { description?: unknown }).description
  return typeof desc === "string" && desc.length > 0
}

export type GeminiDescribeStop = { description: string }