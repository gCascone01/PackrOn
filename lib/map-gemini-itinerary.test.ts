import { describe, expect, it } from "vitest"
import { isActionableTollAlert, mapGeminiTrip, vehicleFromPayload } from "./map-gemini-itinerary"
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

  it("drops purely-negative toll alerts but keeps actionable ones", () => {
    expect(isActionableTollAlert("No vignettes for passenger cars in Italy")).toBe(false)
    expect(isActionableTollAlert("No tolls on this route")).toBe(false)
    expect(isActionableTollAlert("Nessuna vignetta richiesta per le auto")).toBe(false)
    expect(isActionableTollAlert("")).toBe(false)
    expect(isActionableTollAlert("Vignette required in Austria (10 days, €12.80)")).toBe(true)
    expect(isActionableTollAlert("No vignette needed, but the Karawanken tunnel costs €9")).toBe(true)
    expect(isActionableTollAlert("Mont Blanc Tunnel carries a surcharge")).toBe(true)

    const itinerary = mapGeminiTrip(
      {
        ...trip,
        toll_and_vignette_alerts: [
          "No vignettes for passenger cars in Italy",
          "Vignette required in Austria (10 days, €12.80)",
        ],
      },
      payload,
    )
    expect(itinerary.tollNotices.map((n) => n.label)).toEqual([
      "Vignette required in Austria (10 days, €12.80)",
    ])
  })

  it("maps a ricarica charging stop to the charging category with its coordinates", () => {
    const chargingTrip: GeminiTrip = {
      ...trip,
      days: [{
        ...trip.days[0],
        stops: [{
          name: "Ionity Affi fast charge",
          type: "ricarica",
          lat: 45.55,
          lng: 10.77,
          start_time: "11:00",
          end_time: "11:35",
          duration_minutes: 35,
          short_description: "150 kW fast charger, coffee break while charging.",
          sub_stops: [],
        }],
      }],
    }

    const [charging] = mapGeminiTrip(chargingTrip, payload).days[0].stops

    expect(charging).toMatchObject({
      kind: "ricarica",
      category: "ricarica",
      lat: 45.55,
      lng: 10.77,
      time: "11:00",
      endTime: "11:35",
    })
  })

  it("stamps a personal kWh tariff and the declared EV range on the vehicle", () => {
    const vehicle = vehicleFromPayload(
      { ...payload, vehicle: "elettrica", consumption: 18, evRangeKm: 320 },
      { priceEur: 0.2, source: "Tariffa personale", fallback: false, custom: true },
    )

    expect(vehicle).toMatchObject({
      type: "elettrica",
      fuelPrice: 0.2,
      fuelPriceCustom: true,
      rangeKm: 320,
    })
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