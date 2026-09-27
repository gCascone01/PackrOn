import { describe, expect, it } from "vitest"
import { mapGeminiTrip } from "./map-gemini-itinerary"
import { GEMINI_TRIP_SCHEMA, type GeminiTrip } from "./gemini-schema"
import type { GenerateTripPayload } from "./types"

const payload: GenerateTripPayload = {
  mode: "road",
  origin: "Scafati",
  destination: "Bari",
  days: 1,
  pace: "balanced",
  locale: "en",
}

const trip: GeminiTrip = {
  trip_title: "Scafati to Bari",
  summary: "A route east across southern Italy.",
  origin_lat: 40.75,
  origin_lng: 14.53,
  total_km_estimated: 250,
  estimated_fuel_cost_range: "25€ - 35€",
  toll_and_vignette_alerts: [],
  days: [{
    day_number: 1,
    title: "Bari",
    driving_time_minutes: 180,
    stops: [
      {
        name: "Drive from Scafati to Matera",
        type: "drive",
        lat: null,
        lng: null,
        start_time: "08:00",
        end_time: "10:30",
        duration_minutes: 150,
        short_description: "Take the A16 east, with a short service-area break.",
        sub_stops: [],
      },
      {
        name: "Explore Matera's Sassi",
        type: "panoramica",
        lat: 40.6663,
        lng: 16.6043,
        start_time: "10:30",
        end_time: "13:00",
        duration_minutes: 150,
        short_description: "Walk the historic cave districts and stop for local bread.",
        sub_stops: [{
          name: "Casa Grotta nei Sassi",
          type: "museum",
          description: "Explore a recreated cave dwelling with traditional furnishings.",
          booking_url: "https://tickets.example.test/casa-grotta",
          getyourguide_query: "Casa Grotta nei Sassi ticket",
        }],
      },
      {
        name: "Palazzo Gattini Luxury Hotel, Matera",
        type: "notte",
        lat: 40.6665,
        lng: 16.6093,
        start_time: "22:00",
        end_time: "22:30",
        short_description: "Check in after dinner; reserve parking in advance.",
        sub_stops: [],
        booking_query: "Palazzo Gattini Luxury Hotel Matera",
      },
    ],
  }],
}

describe("mapGeminiTrip", () => {
  it("does not require drive coordinates or an overnight duration in the response schema", () => {
    const schema = GEMINI_TRIP_SCHEMA as unknown as {
      properties: {
        days: {
          items: {
            properties: {
              stops: {
                items: {
                  required: string[]
                  properties: {
                    lat: { nullable?: boolean }
                    lng: { nullable?: boolean }
                    sub_stops: { items: { required: string[] } }
                  }
                }
              }
            }
          }
        }
      }
    }
    const stopSchema = schema.properties.days.items.properties.stops.items
    const required = stopSchema.required

    expect(required).not.toContain("lat")
    expect(required).not.toContain("lng")
    expect(required).not.toContain("duration_minutes")
    expect(stopSchema.properties.lat.nullable).toBe(true)
    expect(stopSchema.properties.lng.nullable).toBe(true)
    expect(stopSchema.properties.sub_stops.items.required).toEqual(["name", "type", "description"])
  })

  it("preserves scheduled times, nested queries, coordinate-free drives, and untimed lodging duration", () => {
    const [drive, experience, lodging] = mapGeminiTrip(trip, payload).days[0].stops

    expect(drive).toMatchObject({
      kind: "drive",
      lat: null,
      lng: null,
      time: "08:00",
      endTime: "10:30",
    })
    expect(experience).toMatchObject({
      time: "10:30",
      endTime: "13:00",
      substops: [{
        name: "Casa Grotta nei Sassi",
        type: "museum",
        description: "Explore a recreated cave dwelling with traditional furnishings.",
        bookingUrl: "https://tickets.example.test/casa-grotta",
        getYourGuideQuery: "Casa Grotta nei Sassi ticket",
      }],
    })
    expect(lodging).toMatchObject({
      name: "Palazzo Gattini Luxury Hotel, Matera",
      bookingQuery: "Palazzo Gattini Luxury Hotel Matera",
      time: "22:00",
      endTime: "22:30",
    })
    expect(lodging.duration).toBeUndefined()
  })

  it("maps generated substop descriptions from Gemini JSON into the displayed itinerary shape", () => {
    const avellinoTrip: GeminiTrip = {
      ...trip,
      days: [{
        ...trip.days[0],
        title: "Avellino",
        stops: [{
          ...trip.days[0].stops[1],
          name: "Exploring Avellino City Center",
          lat: 40.9135,
          lng: 14.7865,
          sub_stops: [
            {
              name: "Duomo di Avellino",
              type: "church",
              description: "Visit the cathedral with its distinctive neoclassical facade.",
            },
            {
              name: "Villa Comunale",
              type: "walk",
              description: "Stroll through the lush public gardens, a green lung in the city center.",
            },
          ],
        }],
      }],
    }

    const [mainStop] = mapGeminiTrip(avellinoTrip, payload).days[0].stops

    expect(mainStop.substops).toEqual([
      {
        name: "Duomo di Avellino",
        type: "church",
        description: "Visit the cathedral with its distinctive neoclassical facade.",
        bookingUrl: undefined,
        bookingQuery: undefined,
        getYourGuideQuery: undefined,
      },
      {
        name: "Villa Comunale",
        type: "walk",
        description: "Stroll through the lush public gardens, a green lung in the city center.",
        bookingUrl: undefined,
        bookingQuery: undefined,
        getYourGuideQuery: undefined,
      },
    ])
  })

  it("preserves all requested fields for a GetYourGuide substop", () => {
    const landmarkTrip: GeminiTrip = {
      ...trip,
      days: [{
        ...trip.days[0],
        stops: [{
          ...trip.days[0].stops[1],
          sub_stops: [{
            name: "Arch of Trajan",
            type: "landmark",
            description: "One of the best-preserved Roman triumphal arches.",
            getyourguide_query: "Arch of Trajan guided visit",
          }],
        }],
      }],
    }

    const [mainStop] = mapGeminiTrip(landmarkTrip, payload).days[0].stops

    expect(mainStop.substops).toEqual([{
      name: "Arch of Trajan",
      type: "landmark",
      description: "One of the best-preserved Roman triumphal arches.",
      bookingUrl: undefined,
      bookingQuery: undefined,
      getYourGuideQuery: "Arch of Trajan guided visit",
    }])
  })

  it("adds the city when a lodging result has no explicit booking query", () => {
    const tripWithoutBookingQuery: GeminiTrip = {
      ...trip,
      days: [{
        ...trip.days[0],
        title: "Matera",
        stops: [{
          ...trip.days[0].stops[2],
          booking_query: undefined,
        }],
      }],
    }

    const [lodging] = mapGeminiTrip(tripWithoutBookingQuery, payload).days[0].stops

    expect(lodging.bookingQuery).toBe("Palazzo Gattini Luxury Hotel, Matera")
  })
})