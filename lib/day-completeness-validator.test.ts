import { describe, expect, it } from "vitest"
import { validateDayCompleteness } from "./day-completeness-validator"
import type { ItineraryDay, Stop } from "./types"

function stop(partial: Partial<Stop> & Pick<Stop, "id" | "name" | "category" | "time" | "duration">): Stop {
  return {
    id: partial.id,
    name: partial.name,
    description: partial.description ?? "",
    category: partial.category,
    time: partial.time,
    duration: partial.duration,
    lat: partial.lat ?? 0,
    lng: partial.lng ?? 0,
    bookingQuery: partial.bookingQuery,
    bookingCity: partial.bookingCity,
    getYourGuideQuery: partial.getYourGuideQuery,
  }
}

function createDay(stops: Stop[], dayNumber = 1): ItineraryDay {
  return {
    id: `day-${dayNumber}`,
    dayNumber,
    title: `Day ${dayNumber}`,
    distanceKm: 0,
    drivingTimeMinutes: 0,
    stops,
  }
}

describe("day completeness validator", () => {
  it("marks a complete city day as complete", () => {
    const day = createDay([
      stop({ id: "a", name: "Historic Center", category: "citta", time: "09:30", duration: "2h" }),
      stop({ id: "b", name: "Lunch at Trattoria", category: "food", time: "11:45", duration: "1h" }),
      stop({ id: "c", name: "Duomo", category: "cultura", time: "14:00", duration: "2h" }),
      stop({ id: "d", name: "Viewpoint", category: "panorama", time: "17:00", duration: "1h" }),
      stop({ id: "e", name: "Dinner", category: "food", time: "19:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 30 })
    expect(result.status).toBe("complete")
    expect(result.failures).toHaveLength(0)
  })

  it("warns when a city day has only one short meaningful experience", () => {
    const day = createDay([
      stop({ id: "a", name: "Museum", category: "cultura", time: "10:00", duration: "1h 30m" }),
      stop({ id: "b", name: "Lunch", category: "food", time: "12:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 20 })
    expect(result.status).toBe("warning")
    expect(result.warnings).toContain("only_one_meaningful_experience")
  })

  it("flags a city day ending around lunchtime as incomplete", () => {
    const day = createDay([
      stop({ id: "a", name: "Old Town", category: "borgo", time: "09:30", duration: "2h" }),
      stop({ id: "b", name: "Lunch", category: "food", time: "12:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 0 })
    expect(result.status).toBe("incomplete")
    expect(result.failures).toContain("no_plausible_continuation")
  })

  it("flags a city day with a large unexplained gap as incomplete", () => {
    const day = createDay([
      stop({ id: "a", name: "Museum", category: "cultura", time: "09:30", duration: "2h" }),
      stop({ id: "b", name: "Lunch", category: "food", time: "12:00", duration: "1h" }),
      stop({ id: "c", name: "Hotel", category: "notte", time: "18:30", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 0 })
    expect(result.status).toBe("incomplete")
    expect(result.failures).toContain("major_unexplained_gap")
  })

  it("accepts a road day with high driving and a few meaningful stops", () => {
    const day = createDay([
      stop({ id: "a", name: "Scenic overlook", category: "panorama", time: "09:30", duration: "1h" }),
      stop({ id: "b", name: "Lunch", category: "food", time: "12:00", duration: "1h" }),
      stop({ id: "c", name: "Historic town", category: "borgo", time: "16:00", duration: "2h" }),
      stop({ id: "d", name: "Hotel", category: "notte", time: "18:30", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "road", pace: "balanced", drivingMinutes: 240 })
    expect(result.status).toBe("warning")
    expect(result.warnings).toContain("high_driving_burden")
  })

  it("fails a road day with high driving and almost no meaningful experiences", () => {
    const day = createDay([
      stop({ id: "a", name: "Drive", category: "sosta", time: "09:00", duration: "4h" }),
      stop({ id: "b", name: "Lunch", category: "food", time: "13:30", duration: "1h" }),
      stop({ id: "c", name: "Hotel", category: "notte", time: "18:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "road", pace: "balanced", drivingMinutes: 240 })
    expect(result.status).toBe("incomplete")
    expect(result.failures).toContain("high_driving_burden_without_meaningful_experience")
  })

  it("allows a relaxed day with fewer activities", () => {
    const day = createDay([
      stop({ id: "a", name: "Lake walk", category: "natura", time: "09:30", duration: "2h" }),
      stop({ id: "b", name: "Lunch", category: "food", time: "12:30", duration: "1h" }),
      stop({ id: "c", name: "Hotel", category: "notte", time: "18:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "road", pace: "relaxed", drivingMinutes: 60 })
    expect(result.status).toBe("warning")
    expect(result.status).not.toBe("incomplete")
  })

  it("allows an arrival day to be short and still valid", () => {
    const day = createDay([
      stop({ id: "a", name: "Arrival transfer", category: "sosta", time: "15:00", duration: "1h" }),
      stop({ id: "b", name: "Check-in", category: "notte", time: "16:00", duration: "1h" }),
      stop({ id: "c", name: "Dinner", category: "food", time: "19:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 0, isArrivalDay: true })
    expect(result.status).toBe("complete")
  })

  it("allows a departure or final day to be shorter without failing", () => {
    const day = createDay([
      stop({ id: "a", name: "Old town walk", category: "citta", time: "09:30", duration: "2h" }),
      stop({ id: "b", name: "Departure transfer", category: "sosta", time: "12:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 0, isDepartureDay: true })
    expect(result.status).toBe("warning")
  })

  it("accepts a single major attraction lasting several hours", () => {
    const day = createDay([
      stop({ id: "a", name: "National Museum", category: "cultura", time: "09:30", duration: "3h" }),
      stop({ id: "b", name: "Lunch", category: "food", time: "13:00", duration: "1h" }),
      stop({ id: "c", name: "River walk", category: "natura", time: "15:00", duration: "2h" }),
      stop({ id: "d", name: "Hotel", category: "notte", time: "18:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 10 })
    expect(result.status).toBe("complete")
  })

  it("fails a day that is almost entirely logistics", () => {
    const day = createDay([
      stop({ id: "a", name: "Lunch", category: "food", time: "12:00", duration: "1h" }),
      stop({ id: "b", name: "Hotel check-in", category: "notte", time: "15:00", duration: "1h" }),
      stop({ id: "c", name: "Dinner", category: "food", time: "19:00", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 0 })
    expect(result.status).toBe("incomplete")
    expect(result.failures).toContain("no_meaningful_experience")
  })

  it("fails a day with morning and midday but no afternoon continuation", () => {
    const day = createDay([
      stop({ id: "a", name: "Museum", category: "cultura", time: "09:30", duration: "2h" }),
      stop({ id: "b", name: "Lunch", category: "food", time: "12:00", duration: "1h" }),
      stop({ id: "c", name: "Hotel", category: "notte", time: "13:30", duration: "1h" }),
    ])

    const result = validateDayCompleteness(day, { tripType: "city", pace: "balanced", drivingMinutes: 0 })
    expect(result.status).toBe("incomplete")
    expect(result.failures).toContain("no_plausible_continuation")
  })
})
