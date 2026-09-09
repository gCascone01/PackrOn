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
      description: "Short, appealing itinerary title in the requested output language",
    },
    summary: {
      type: Type.STRING,
      description: "One or two sentence trip summary in the requested output language",
    },
    total_km_estimated: {
      type: Type.NUMBER,
      description: "Estimated total kilometres; use 0 for a walking city trip",
    },
    estimated_fuel_cost_range: {
      type: Type.STRING,
      description: 'Estimated fuel cost range, for example "120€ - 150€", or "0€" for a city trip',
    },
    toll_and_vignette_alerts: {
      type: Type.ARRAY,
      description: "Toll, vignette, or road-charge alerts in the requested output language; use an empty array when not applicable",
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
          title: {
            type: Type.STRING,
            description: "Day title clearly identifying the area or city and its main focus, in the requested output language",
          },
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
                  description: "Stop type: panoramica, pasto, museo, or notte",
                },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
                duration_minutes: {
                  type: Type.INTEGER,
                  description: "Realistic stop duration in minutes with no overlaps; allow enough time for meals, check-in, and evening activities",
                },
                short_description: {
                  type: Type.STRING,
                  description: "Concrete description with specific points of interest; for meals mention local dishes; include parking or booking guidance when relevant, in the requested output language",
                },
                booking_query: {
                  type: Type.STRING,
                  description: "Exact hotel or B&B name followed by the city; never use a city-only or area-only search",
                },
                getyourguide_query: {
                  type: Type.STRING,
                  description: "Search query for the experience or activity",
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
