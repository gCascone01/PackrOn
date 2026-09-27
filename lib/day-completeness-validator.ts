import type { ItineraryDay, Stop } from "./types"

export type DayTripType = "city" | "road"
export type DayPace = "relaxed" | "balanced" | "intense"
export type DrivingBurden = "LOW" | "MODERATE" | "HIGH"
export type DayCompletenessStatus = "complete" | "warning" | "incomplete"

export interface DayCompletenessContext {
  tripType: DayTripType
  pace?: DayPace
  drivingMinutes?: number
  isArrivalDay?: boolean
  isDepartureDay?: boolean
  isFinalDay?: boolean
  isTransitHeavy?: boolean
}

export interface DayCoverage {
  morning: boolean
  midday: boolean
  afternoon: boolean
  evening: boolean
}

export interface DayCompletenessMetrics {
  meaningfulExperienceCount: number
  meaningfulMinutes: number
  logisticalMinutes: number
  totalOccupiedMinutes: number
  drivingMinutes: number
  drivingBurden: DrivingBurden
  mappedTimelineMinutes: number
  largestGapMinutes: number
  firstMeaningfulActivity: string | null
  lastMeaningfulActivity: string | null
}

export interface DayCompletenessResult {
  status: DayCompletenessStatus
  metrics: DayCompletenessMetrics
  coverage: DayCoverage
  failures: string[]
  warnings: string[]
  strengths: string[]
  repairPriorities: string[]
}

const DAY_START = 9 * 60

function parseClockMinutes(value?: string): number {
  if (!value) return DAY_START
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value)
  if (!match) return DAY_START
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours * 60 + minutes
}

function parseDurationMinutes(value?: string): number {
  if (!value || value === "—") return 0
  const text = value.trim().toLowerCase()
  const hoursMatch = text.match(/(\d+)h/)
  const minutesMatch = text.match(/(\d+)m/)
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0
  return hours * 60 + minutes
}

function isMealLikeName(name: string): boolean {
  return /lunch|dinner|restaurant|cafe|coffee|breakfast|meal|eatery|trattoria|osteria|pizzeria/i.test(name)
}

function isHotelLikeName(name: string): boolean {
  return /hotel|guesthouse|bnb|bed and breakfast|accommodation|overnight|check-in|check in|hostel|resort|suite|inn/i.test(name)
}

function isTransportLikeName(name: string): boolean {
  return /airport|station|transfer|train|bus|ride|drive|departure|arrival|parking|rest stop/i.test(name)
}

function isMeaningfulStop(stop: Stop): boolean {
  const label = `${stop.name} ${stop.description ?? ""}`.toLowerCase()

  if (stop.category === "food" || stop.category === "notte") {
    if (isMealLikeName(stop.name) || isHotelLikeName(stop.name)) return false
    return false
  }

  if (stop.category === "sosta") return false

  if (stop.category === "panorama" || stop.category === "cultura" || stop.category === "natura" || stop.category === "borgo" || stop.category === "citta") {
    return true
  }

  if (isTransportLikeName(stop.name) || isHotelLikeName(stop.name) || isMealLikeName(stop.name)) {
    return false
  }

  return /museum|castle|cathedral|viewpoint|landmark|beach|park|garden|district|historic|neighborhood|old town|square|market|walk|trail|lake|river|monument|palace|church|temple|fortress|village|piazza|bridge|harbor|coast|canyon|nature|forest|fountain|gallery/i.test(label)
}

function isLogisticalStop(stop: Stop): boolean {
  const label = `${stop.name} ${stop.description ?? ""}`.toLowerCase()
  if (stop.category === "food") return true
  if (stop.category === "notte") return true
  if (isMealLikeName(stop.name) || isHotelLikeName(stop.name) || isTransportLikeName(stop.name)) return true
  if (/hotel|guesthouse|bnb|check-in|check in|overnight|airport|station|transfer|parking|rest stop|departure|arrival/i.test(label)) return true
  return false
}

function getDrivingBurden(minutes: number): DrivingBurden {
  if (minutes < 90) return "LOW"
  if (minutes <= 180) return "MODERATE"
  return "HIGH"
}

function getExpectedTotalMinutes(context: DayCompletenessContext): number {
  const pace = context.pace ?? "balanced"
  if (context.tripType === "city") {
    if (pace === "relaxed") return 180
    if (pace === "intense") return 300
    return 240
  }

  const burden = getDrivingBurden(context.drivingMinutes ?? 0)
  if (burden === "HIGH") return 120
  if (burden === "MODERATE") return 180
  if (pace === "relaxed") return 180
  if (pace === "intense") return 260
  return 220
}

function getMinimumMeaningfulMinutes(context: DayCompletenessContext): number {
  const pace = context.pace ?? "balanced"
  if (context.tripType === "city") {
    if (pace === "relaxed") return 90
    if (pace === "intense") return 180
    return 120
  }

  const burden = getDrivingBurden(context.drivingMinutes ?? 0)
  if (burden === "HIGH") return 45
  if (burden === "MODERATE") return 80
  if (pace === "relaxed") return 75
  if (pace === "intense") return 140
  return 100
}

function coverageForStops(stops: Stop[], windowStart: number, windowEnd: number): boolean {
  if (!stops.length) return false
  return stops.some((stop) => {
    const start = parseClockMinutes(stop.time)
    const end = start + parseDurationMinutes(stop.duration)
    return start >= windowStart && start < windowEnd
      || end > windowStart && end <= windowEnd
      || start < windowStart && end > windowStart
      || start < windowEnd && end > windowEnd
  })
}

function getCoverage(stops: Stop[]): DayCoverage {
  const meaningfulStops = stops.filter(isMeaningfulStop)
  const middayStops = [...meaningfulStops, ...stops.filter(isLogisticalStop)]
  const eveningStops = [...meaningfulStops, ...stops.filter((stop) => isLogisticalStop(stop) && (isHotelLikeName(stop.name) || isMealLikeName(stop.name)))]
  return {
    morning: coverageForStops(meaningfulStops, 9 * 60, 12 * 60),
    midday: coverageForStops(middayStops, 11 * 60, 14 * 60),
    afternoon: coverageForStops(meaningfulStops, 14 * 60, 17 * 60),
    evening: coverageForStops(eveningStops, 17 * 60, 22 * 60),
  }
}

function computeMappedTimelineMinutes(stops: Stop[]): number {
  if (!stops.length) return 0
  const parsed = stops.map((stop) => ({
    start: parseClockMinutes(stop.time),
    end: parseClockMinutes(stop.time) + parseDurationMinutes(stop.duration),
  }))
  return Math.max(...parsed.map((item) => item.end)) - DAY_START
}

function computeLargestGapMinutes(stops: Stop[]): number {
  if (stops.length < 2) return 0
  const ordered = [...stops].sort((a, b) => parseClockMinutes(a.time) - parseClockMinutes(b.time))
  let largest = 0
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const current = ordered[index]
    const previousEnd = parseClockMinutes(previous.time) + parseDurationMinutes(previous.duration)
    const currentStart = parseClockMinutes(current.time)
    largest = Math.max(largest, Math.max(0, currentStart - previousEnd))
  }
  return largest
}

function getMeaningfulStops(stops: Stop[]): Stop[] {
  return stops.filter(isMeaningfulStop)
}

function getLogisticalStops(stops: Stop[]): Stop[] {
  return stops.filter(isLogisticalStop)
}

export function validateDayCompleteness(
  day: ItineraryDay,
  context: DayCompletenessContext,
): DayCompletenessResult {
  const stops = day.stops ?? []
  const meaningfulStops = getMeaningfulStops(stops)
  const logisticalStops = getLogisticalStops(stops)

  const meaningfulExperienceCount = meaningfulStops.length
  const meaningfulMinutes = meaningfulStops.reduce((sum, stop) => sum + parseDurationMinutes(stop.duration), 0)
  const logisticalMinutes = logisticalStops.reduce((sum, stop) => sum + parseDurationMinutes(stop.duration), 0)
  const totalOccupiedMinutes = stops.reduce((sum, stop) => sum + parseDurationMinutes(stop.duration), 0)
  const drivingMinutes = Math.max(0, Math.round(context.drivingMinutes ?? 0))
  const drivingBurden = getDrivingBurden(drivingMinutes)
  const mappedTimelineMinutes = computeMappedTimelineMinutes(stops)
  const largestGapMinutes = computeLargestGapMinutes(stops)

  const firstMeaningfulActivity = meaningfulStops.length > 0
    ? meaningfulStops.reduce((earliest, stop) => {
        const current = parseClockMinutes(stop.time)
        return current < parseClockMinutes(earliest.time) ? stop : earliest
      }, meaningfulStops[0]).time
    : null

  const lastMeaningfulActivity = meaningfulStops.length > 0
    ? meaningfulStops.reduce((latest, stop) => {
        const current = parseClockMinutes(stop.time) + parseDurationMinutes(stop.duration)
        const latestEnd = parseClockMinutes(latest.time) + parseDurationMinutes(latest.duration)
        return current > latestEnd ? stop : latest
      }, meaningfulStops[0]).time
    : null

  const coverage = getCoverage(stops)
  const pace = context.pace ?? "balanced"
  const isArrivalDay = Boolean(context.isArrivalDay)
  const isDepartureDay = Boolean(context.isDepartureDay)
  const isFinalDay = Boolean(context.isFinalDay)
  const isTransitHeavy = Boolean(context.isTransitHeavy)
  const hasShortContextDay = isArrivalDay || isDepartureDay || isFinalDay || isTransitHeavy

  const minimumMeaningfulMinutes = getMinimumMeaningfulMinutes(context)
  const minimumTotal = getExpectedTotalMinutes(context)

  const failures: string[] = []
  const warnings: string[] = []
  const strengths: string[] = []
  const repairPriorities: string[] = []

  if (meaningfulExperienceCount === 0 && !hasShortContextDay) {
    failures.push("no_meaningful_experience")
    repairPriorities.push("add_meaningful_experience")
  }

  if (meaningfulExperienceCount === 0 && hasShortContextDay && !(isArrivalDay && coverage.evening && logisticalMinutes >= 60)) {
    warnings.push("travel_day_without_meaningful_experience")
  }

  if (totalOccupiedMinutes < Math.min(75, minimumTotal * 0.5) && !hasShortContextDay) {
    failures.push("extremely_short_day")
    repairPriorities.push("extend_day")
  }

  if (!hasShortContextDay && context.tripType === "city" && !coverage.midday && meaningfulExperienceCount > 1) {
    failures.push("missing_midday_structure")
    repairPriorities.push("add_midday_anchor")
  }

  if (!hasShortContextDay && context.tripType === "city" && !coverage.afternoon && coverage.morning && meaningfulExperienceCount >= 1 && meaningfulMinutes >= 120) {
    failures.push("no_plausible_continuation")
    repairPriorities.push("add_afternoon_experience")
  }

  if (!hasShortContextDay && context.tripType === "city" && !coverage.evening && totalOccupiedMinutes >= minimumTotal * 0.8 && meaningfulExperienceCount > 1) {
    failures.push("missing_evening_continuation")
    repairPriorities.push("add_evening_anchor")
  }

  const softMeaningfulShortfall = context.tripType === "road" && pace === "relaxed" && drivingBurden !== "LOW"

  if (meaningfulMinutes < minimumMeaningfulMinutes && !(isArrivalDay || isDepartureDay || isFinalDay || isTransitHeavy)) {
    if (softMeaningfulShortfall) {
      warnings.push("low_meaningful_activity_minutes")
      repairPriorities.push("add_meaningful_experience")
    } else if (meaningfulExperienceCount <= 1) {
      warnings.push("only_one_meaningful_experience")
      repairPriorities.push("add_meaningful_experience")
    } else {
      warnings.push("low_meaningful_activity_minutes")
      repairPriorities.push("add_meaningful_experience")
    }
  }

  if (context.tripType === "city" && largestGapMinutes > 180 && !isArrivalDay && !isDepartureDay && !isFinalDay && !isTransitHeavy) {
    failures.push("major_unexplained_gap")
    repairPriorities.push("resolve_large_gap")
  }

  if (context.tripType === "road" && largestGapMinutes > 180 && meaningfulExperienceCount === 0 && !isArrivalDay && !isDepartureDay && !isFinalDay && !isTransitHeavy) {
    failures.push("major_unexplained_gap")
    repairPriorities.push("resolve_large_gap")
  }

  if (context.tripType === "road" && drivingBurden === "HIGH" && meaningfulExperienceCount === 0) {
    failures.push("high_driving_burden_without_meaningful_experience")
    repairPriorities.push("add_meaningful_experience")
  }

  if (meaningfulExperienceCount <= 1 && !hasShortContextDay) {
    warnings.push("only_one_meaningful_experience")
    repairPriorities.push("add_meaningful_experience")
  }

  if (!isArrivalDay && hasShortContextDay && meaningfulExperienceCount <= 1 && !coverage.evening && totalOccupiedMinutes >= 120) {
    warnings.push("short_context_day_with_weak_evening_structure")
  }

  if ((isDepartureDay || isFinalDay) && meaningfulExperienceCount > 0 && totalOccupiedMinutes < minimumTotal * 0.9) {
    warnings.push("short_context_day")
  }

  if (drivingBurden === "HIGH" && meaningfulExperienceCount <= 2) {
    warnings.push("high_driving_burden")
  }

  if (!coverage.evening && !hasShortContextDay && meaningfulExperienceCount > 0) {
    warnings.push("weak_evening_structure")
    repairPriorities.push("add_evening_anchor")
  }

  if (totalOccupiedMinutes < minimumTotal && !hasShortContextDay) {
    warnings.push("low_activity_density")
  }

  if (!isArrivalDay && logisticalMinutes > totalOccupiedMinutes * 0.5 && meaningfulExperienceCount <= 2) {
    warnings.push("day_largely_logistics")
  }

  if (!coverage.morning && !isArrivalDay && !isDepartureDay && !isFinalDay) {
    warnings.push("weak_morning_start")
    repairPriorities.push("add_morning_start")
  }

  if (mappedTimelineMinutes < minimumTotal * 0.8 && !hasShortContextDay) {
    warnings.push("mapped_timeline_short_for_context")
  }

  if (meaningfulMinutes >= minimumMeaningfulMinutes && coverage.morning && coverage.midday && coverage.afternoon) {
    strengths.push("coherent_day_arc")
  }

  if (meaningfulExperienceCount >= 2) {
    strengths.push("multiple_meaningful_experiences")
  }

  if (coverage.evening) {
    strengths.push("evening_continuation")
  }

  if (drivingBurden === "HIGH" && meaningfulExperienceCount >= 1) {
    strengths.push("travel_heavy_day_with_real_experiences")
  }

  if (meaningfulExperienceCount === 0 && totalOccupiedMinutes > 0) {
    strengths.push("practical_activity_present")
  }

  const status: DayCompletenessStatus = failures.length > 0 ? "incomplete" : warnings.length > 0 ? "warning" : "complete"

  return {
    status,
    metrics: {
      meaningfulExperienceCount,
      meaningfulMinutes,
      logisticalMinutes,
      totalOccupiedMinutes,
      drivingMinutes,
      drivingBurden,
      mappedTimelineMinutes,
      largestGapMinutes,
      firstMeaningfulActivity,
      lastMeaningfulActivity,
    },
    coverage,
    failures,
    warnings,
    strengths,
    repairPriorities: Array.from(new Set(repairPriorities)),
  }
}
