import type { GeminiTrip } from "./gemini-schema"
import type { Itinerary } from "./types"

export function isGeminiDebugEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "development" && env.DEBUG_GEMINI === "true"
}

export function createGeminiDebugId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function logGeminiDebugStart(debugId: string, prompt: string): void {
  console.log(`=== GEMINI DEBUG START (${debugId}) ===`)
  console.log("=== GEMINI PROMPT START ===")
  console.log(prompt)
  console.log("=== GEMINI PROMPT END ===")
}

export function logGeminiRawResponse(rawResponse: string): void {
  console.log("=== GEMINI RAW RESPONSE START ===")
  console.log(rawResponse)
  console.log("=== GEMINI RAW RESPONSE END ===")
}

export function logGeminiParsedJson(parsed: unknown): void {
  console.log("=== GEMINI PARSED JSON START ===")
  console.log(JSON.stringify(parsed, null, 2))
  console.log("=== GEMINI PARSED JSON END ===")
}

export function logGeminiMappedItinerary(itinerary: Itinerary, raw: GeminiTrip): void {
  console.log("=== PACKRON MAPPED ITINERARY START ===")
  console.log(JSON.stringify(itinerary, null, 2))
  console.log("=== PACKRON MAPPED ITINERARY END ===")
  console.log("=== GEMINI DAY SUMMARY START ===")

  raw.days.forEach((rawDay, index) => {
    const mappedDay = itinerary.days[index]
    const rawStops = rawDay.stops ?? []
    const mappedStops = mappedDay?.stops ?? []
    console.log(JSON.stringify({
      dayNumber: rawDay.day_number,
      rawDrivingTimeMinutes: rawDay.driving_time_minutes,
      rawStopCount: rawStops.length,
      rawStops: rawStops.map((stop) => ({
        name: stop.name,
        type: stop.type,
        durationMinutes: stop.duration_minutes,
      })),
      mappedStopCount: mappedStops.length,
      mappedStops: mappedStops.map((stop) => ({
        name: stop.name,
        startTime: stop.time,
        duration: stop.duration,
        substops: stop.substops?.map((substop) => ({
          name: substop.name,
          description: substop.description,
        })),
      })),
    }, null, 2))
  })

  console.log("=== GEMINI DAY SUMMARY END ===")
  console.log("=== GEMINI DEBUG END ===")
}
