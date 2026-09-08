import { Type, type Schema } from "@google/genai"

export const GEMINI_TRIP_SCHEMA: Schema = {
  type: Type.OBJECT,
  propertyOrdering: [
    "trip_title",
    "summary",
    "total_km_estimated",
    "estimated_fuel_cost_range",
    "toll_and_vignette_alerts",
    "days",
  ],
  required: [
    "trip_title",
    "summary",
    "total_km_estimated",
    "estimated_fuel_cost_range",
    "toll_and_vignette_alerts",
    "days",
  ],
  properties: {
    trip_title: {
      type: Type.STRING,
      description: "Titolo accattivante e breve dell'itinerario",
    },
    summary: {
      type: Type.STRING,
      description: "Riassunto in 1-2 frasi del viaggio",
    },
    total_km_estimated: {
      type: Type.NUMBER,
      description: "Chilometri totali stimati (0 per city trip a piedi)",
    },
    estimated_fuel_cost_range: {
      type: Type.STRING,
      description: 'Fascia di costo carburante, es. "120€ - 150€" oppure "0€" per city trip',
    },
    toll_and_vignette_alerts: {
      type: Type.ARRAY,
      description: "Avvisi su bollini autostradali, vignette o pedaggi. Array vuoto se non applicabile.",
      items: { type: Type.STRING },
    },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        propertyOrdering: ["day_number", "title", "driving_time_minutes", "stops"],
        required: ["day_number", "title", "driving_time_minutes", "stops"],
        properties: {
          day_number: { type: Type.INTEGER },
          title: { type: Type.STRING },
          driving_time_minutes: {
            type: Type.INTEGER,
            description: "Minuti di guida stimati per la giornata (0 per city trip)",
          },
          stops: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              propertyOrdering: [
                "name",
                "type",
                "lat",
                "lng",
                "duration_minutes",
                "short_description",
                "booking_query",
                "getyourguide_query",
              ],
              required: [
                "name",
                "type",
                "lat",
                "lng",
                "duration_minutes",
                "short_description",
                "booking_query",
                "getyourguide_query",
              ],
              properties: {
                name: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  enum: ["panoramica", "pasto", "museo", "notte"],
                  description: "Tipo sosta: panoramica, pasto, museo o notte",
                },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
                duration_minutes: { type: Type.INTEGER },
                short_description: { type: Type.STRING },
                booking_query: {
                  type: Type.STRING,
                  description: "Query di ricerca alloggio (città o zona)",
                },
                getyourguide_query: {
                  type: Type.STRING,
                  description: "Query di ricerca esperienze/attività",
                },
              },
            },
          },
        },
      },
    },
  },
}

export interface GeminiStop {
  name: string
  type: "panoramica" | "pasto" | "museo" | "notte"
  lat: number
  lng: number
  duration_minutes: number
  short_description: string
  booking_query: string
  getyourguide_query: string
}

export interface GeminiDay {
  day_number: number
  title: string
  driving_time_minutes: number
  stops: GeminiStop[]
}

export interface GeminiTrip {
  trip_title: string
  summary: string
  total_km_estimated: number
  estimated_fuel_cost_range: string
  toll_and_vignette_alerts: string[]
  days: GeminiDay[]
}
