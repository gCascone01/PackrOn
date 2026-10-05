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

/**
 * Detects a model-overload failure (HTTP 503 / UNAVAILABLE): the request is
 * valid, the model is just saturated. The raw SDK error is a JSON blob like
 * `{"error":{"code":503,"message":"...high demand...","status":"UNAVAILABLE"}}`,
 * which is useless to users — routes map it to a friendly retry message.
 */
export function isOverloadedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const record = error as Record<string, unknown>
  const candidates: unknown[] = [record.status, record.code, record.message]
  const nested = record.error
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>
    candidates.push(inner.status, inner.code, inner.message)
  }
  for (const candidate of candidates) {
    if (typeof candidate === "number" && candidate === 503) return true
    if (typeof candidate === "string") {
      const text = candidate.toLowerCase()
      if (
        text.includes("unavailable") ||
        text.includes("overload") ||
        text.includes("high demand") ||
        text.includes("try again later") ||
        /\b503\b/.test(text)
      ) {
        return true
      }
    }
  }
  return false
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
