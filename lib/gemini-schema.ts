import { Type, type Schema } from "@google/genai"

export const GEMINI_TRIP_SCHEMA: Schema = {
  type: Type.OBJECT,
  propertyOrdering: [
    "impossible_trip",
    "reason",
    "error_code",
    "trip_title",
    "summary",
    "origin_lat",
    "origin_lng",
    "total_km_estimated",
    "estimated_fuel_cost_range",
    "toll_and_vignette_alerts",
    "days",
  ],
  required: [
    "trip_title",
    "summary",
    "origin_lat",
    "origin_lng",
    "total_km_estimated",
    "estimated_fuel_cost_range",
    "toll_and_vignette_alerts",
    "days",
  ],
  properties: {
    impossible_trip: {
      type: Type.BOOLEAN,
      description:
        "Set to true only when the trip is impossible after best-effort interpretation of place names (tolerate typos, transliterations, alternative names): ungeocodable gibberish/fictional place, or a route needing a flight (different continents, ocean crossing). Never impose a distance limit. Always fill the remaining required fields with minimal values and explain why in 'reason'. Omit or set to false for a normal trip.",
    },
    reason: {
      type: Type.STRING,
      description: "Explain which location is invalid or why a flight is required, in English. Empty string for a normal trip.",
    },
    error_code: {
      type: Type.STRING,
      enum: ["invalid_city", "invalid_origin", "invalid_destination", "too_far", "impossible"],
      description:
        "Machine-readable error category, set together with impossible_trip: which location is invalid, or impossible for routes needing a flight. The too_far value is reserved for client-side distance checks — never set it for distance yourself. Omit for a normal trip.",
    },
    trip_title: {
      type: Type.STRING,
      description: "Short, appealing itinerary title in English",
    },
    summary: {
      type: Type.STRING,
      description: "One or two sentence trip summary in English",
    },
    origin_lat: {
      type: Type.NUMBER,
      description: "Latitude of the trip origin (starting point)",
    },
    origin_lng: {
      type: Type.NUMBER,
      description: "Longitude of the trip origin (starting point)",
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
      description: "Toll, vignette, or road-charge alerts in English; list each country crossed and use an empty array when not applicable",
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
            description: "Day title clearly identifying the area or city and its main focus, in English",
          },
          driving_time_minutes: {
            type: Type.INTEGER,
            description: "Estimated driving minutes for the day (0 for a city trip)",
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
                "start_time",
                "end_time",
                "duration_minutes",
                "short_description",
                "sub_stops",
                "booking_query",
                "getyourguide_query",
              ],
              required: [
                "name",
                "type",
                "start_time",
                "end_time",
                "short_description",
                "sub_stops",
              ],
              properties: {
                name: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  enum: ["drive", "breakfast", "panoramica", "pasto", "museo", "ricarica", "notte"],
                  description: "Main stop type: drive, breakfast, pasto (lunch/dinner), panoramica, museo, ricarica (EV charging stop with real station coords), or notte",
                },
                lat: { type: Type.NUMBER, nullable: true, description: "Real latitude for located main stops; omit or set null for drive entries" },
                lng: { type: Type.NUMBER, nullable: true, description: "Real longitude for located main stops; omit or set null for drive entries" },
                start_time: {
                  type: Type.STRING,
                  description: "Scheduled local start time in 24-hour HH:MM format",
                },
                end_time: {
                  type: Type.STRING,
                  description: "Scheduled local end time in 24-hour HH:MM format",
                },
                duration_minutes: {
                  type: Type.INTEGER,
                  description: "Overall main-stop duration in minutes; omit or set to 0 for type=notte",
                },
                short_description: {
                  type: Type.STRING,
                  description: "Concrete description in English; meals name specific local dishes, drives include route/logistics, and overnight stays include check-in guidance",
                },
                sub_stops: {
                  type: Type.ARRAY,
                  description: "Specific landmarks or actions that belong inside this main experience; empty for meals, drives, and lodging",
                  items: {
                    type: Type.OBJECT,
                    propertyOrdering: ["name", "type", "description", "booking_url", "booking_query", "getyourguide_query"],
                    required: ["name", "type", "description"],
                    properties: {
                      name: { type: Type.STRING, description: "Specific thing to see, do, or try, in English" },
                      type: {
                        type: Type.STRING,
                        enum: ["walk", "landmark", "museum", "food", "church", "viewpoint", "other"],
                        description: "Activity kind used to choose a display icon",
                      },
                      description: {
                        type: Type.STRING,
                        description: "Concise, specific details about this activity, in English",
                      },
                      booking_url: {
                        type: Type.STRING,
                        description: "Optional direct HTTPS booking/ticket URL for this specific activity",
                      },
                      booking_query: {
                        type: Type.STRING,
                        description: "Optional precise booking search relevant to this substop; omit when not applicable",
                      },
                      getyourguide_query: {
                        type: Type.STRING,
                        description: "Optional attraction or activity search relevant to this substop; omit when not applicable",
                      },
                    },
                  },
                },
                booking_query: {
                  type: Type.STRING,
                  description: "For lodging only, exact hotel or B&B name followed by the city; never use a city-only or area-only search",
                },
                getyourguide_query: {
                  type: Type.STRING,
                  description: "Optional only for a standalone main experience; otherwise attach the precise query to its relevant sub_stops item",
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
  type: "drive" | "breakfast" | "panoramica" | "pasto" | "museo" | "ricarica" | "notte"
  lat?: number | null
  lng?: number | null
  start_time: string
  end_time: string
  duration_minutes?: number | null
  short_description: string
  sub_stops: Array<{
    name: string
    type: "walk" | "landmark" | "museum" | "food" | "church" | "viewpoint" | "other"
    description: string
    booking_url?: string
    booking_query?: string
    getyourguide_query?: string
  }>
  booking_query?: string
  getyourguide_query?: string
}

export interface GeminiDay {
  day_number: number
  title: string
  driving_time_minutes: number
  stops: GeminiStop[]
}

export interface GeminiTrip {
  impossible_trip?: boolean;
  reason?: string;
  error_code?: "invalid_city" | "invalid_origin" | "invalid_destination" | "too_far" | "impossible";
  trip_title: string;
  summary: string;
  origin_lat: number;
  origin_lng: number;
  total_km_estimated: number;
  estimated_fuel_cost_range: string;
  toll_and_vignette_alerts: string[];
  days: GeminiDay[];
}
