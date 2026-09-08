import type { GenerateTripPayload } from "./types"
import type { Locale } from "./i18n"

const PACE_ROAD: Record<string, { it: string; en: string }> = {
  relax: {
    it: "rilassato (max 1.5–2 ore di guida al giorno)",
    en: "relaxed (max 1.5–2 hours of driving per day)",
  },
  balanced: {
    it: "equilibrato (2–3 ore di guida al giorno)",
    en: "balanced (2–3 hours of driving per day)",
  },
  fast: {
    it: "intenso / macinachilometri (4–5 ore di guida al giorno)",
    en: "intense / high-mileage (4–5 hours of driving per day)",
  },
}

const PACE_CITY: Record<string, { it: string; en: string }> = {
  chill: { it: "poche tappe, con calma", en: "few stops, unhurried" },
  balanced: { it: "mix equilibrato", en: "balanced mix" },
  packed: { it: "vedere il più possibile", en: "see as much as possible" },
}

function localeOf(payload: GenerateTripPayload): Locale {
  return payload.locale === "en" ? "en" : "it"
}

export function buildTripPrompt(payload: GenerateTripPayload): string {
  const locale = localeOf(payload)
  const languageLine =
    locale === "en"
      ? "Write all user-facing text in English: titles, summaries, stop names can stay local, short_description, booking_query, getyourguide_query, and alerts must be English. No markdown."
      : "Testi in italiano, concreti, senza markdown."

  if (payload.mode === "city") {
    return [
      locale === "en"
        ? "You are an expert travel planner. Generate a realistic city trip walkable or usable with public transport."
        : "Sei un travel planner esperto. Genera un city trip realistico e visitabile a piedi o con mezzi urbani.",
      `City: ${payload.city}`,
      `Duration: ${payload.days} days`,
      `Pace: ${PACE_CITY[payload.pace]?.[locale] ?? payload.pace}`,
      `Interests: ${(payload.interests ?? []).join(", ") || (locale === "en" ? "culture and food mix" : "mix culturale e food")}`,
      payload.notes ? `Traveller notes: ${payload.notes}` : "",
      "Rules:",
      "- Real, precise lat/lng for every stop.",
      "- 3-5 stops per day, including a meal and an overnight (type notte) when it makes sense.",
      '- total_km_estimated = 0, estimated_fuel_cost_range = "0€", toll_and_vignette_alerts = [].',
      "- driving_time_minutes = 0 for each day (short urban moves).",
      "- booking_query: neighbourhood or city name for hotels.",
      "- getyourguide_query: attraction or experience search query.",
      `- ${languageLine}`,
    ]
      .filter(Boolean)
      .join("\n")
  }

  return [
    locale === "en"
      ? "You are an expert European road-trip planner. Generate a realistic driving itinerary with coherent distances and driving times."
      : "Sei un travel planner esperto di road trip europei. Genera un itinerario automobilistico realistico, con distanze e tempi di guida coerenti.",
    `Origin: ${payload.origin}`,
    `Destinations / areas: ${payload.destination}`,
    `Duration: ${payload.days} days`,
    `Type: ${payload.loop ? (locale === "en" ? "loop (return to the start)" : "ad anello (tornare al punto di partenza)") : locale === "en" ? "one way" : "solo andata"}`,
    `Stays: ${payload.basecamp ? (locale === "en" ? "fixed basecamp with day trips" : "basecamp fisso con escursioni giornaliere") : locale === "en" ? "new city every night" : "nuova città ogni notte"}`,
    `Pace: ${PACE_ROAD[payload.pace]?.[locale] ?? payload.pace}`,
    `Crew: ${(payload.crew ?? []).join(", ") || (locale === "en" ? "unspecified" : "non specificato")}`,
    `Route style: ${(payload.routeTags ?? []).join(", ") || "mix"}`,
    `Vehicle: ${payload.vehicle ?? "car"}`,
    payload.consumption ? `Declared consumption: ${payload.consumption} L/100km (or kWh/100km if EV)` : "",
    `Tolls: ${payload.avoidTolls ? (locale === "en" ? "avoid motorways and toll roads" : "evitare autostrade e strade a pedaggio") : locale === "en" ? "motorways allowed if convenient" : "autostrade ammesse se convenienti"}`,
    payload.notes ? `Traveller notes: ${payload.notes}` : "",
    "Rules:",
    "- Real, precise lat/lng.",
    "- Each day: 3-5 stops, mix of panoramica / pasto / museo / notte.",
    "- Include at least one type=notte stop (lodging) each day, except the last day if it is only the return.",
    "- driving_time_minutes must match the chosen pace.",
    '- Estimate total_km_estimated and estimated_fuel_cost_range in euro (e.g. "120€ - 150€").',
    "- In toll_and_vignette_alerts list vignettes and tolls for countries crossed.",
    "- booking_query: city or area for that stop's hotel.",
    "- getyourguide_query: attraction or activity name.",
    `- ${languageLine}`,
  ]
    .filter(Boolean)
    .join("\n")
}
