import { GoogleGenAI, type Schema } from "@google/genai"
import type { Locale } from "./i18n"

export const MODEL_PRIMARY = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite"
export const MODEL_FALLBACK = "gemini-3.1-flash-lite-preview"

export function parseJsonPayload(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw)
}

export async function generateJson(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  locale: Locale,
  schema?: Schema,
) {
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
      ...(schema ? { responseSchema: schema } : {}),
      ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  })
}

export async function generateJsonWithFallback(prompt: string, locale: Locale, schema?: Schema) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("MISSING_KEY")
  }
  const ai = new GoogleGenAI({ apiKey })
  try {
    return await generateJson(ai, MODEL_PRIMARY, prompt, locale, schema)
  } catch (primaryError) {
    if (MODEL_PRIMARY === MODEL_FALLBACK) throw primaryError
    return await generateJson(ai, MODEL_FALLBACK, prompt, locale, schema)
  }
}
