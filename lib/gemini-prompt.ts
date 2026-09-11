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
  return payload.locale === "it" ? "it" : "en"
}

export function buildTripPrompt(payload: GenerateTripPayload): string {
  const locale = localeOf(payload)
  const languageLine =
    locale === "en"
      ? "IMPORTANT LANGUAGE RULE: write every user-facing text field in English. This includes trip_title, summary, day titles, stop names when a translated name exists, short_description, booking_query, getyourguide_query, and toll alerts. Keep only official local proper names unchanged. Do not write Italian. No markdown."
      : "Testi in italiano, concreti, senza markdown."

  // --- IMPOSSIBLE TRIP DETECTION (PRIORITY: first) ---
  // The response schema always includes the optional "impossible_trip" flag,
  // so for invalid trips Gemini MUST set impossible_trip=true and explain in
  // "reason". Remaining required trip fields still have to be filled with
  // minimal values (short title/summary, empty days array). The API checks
  // the flag BEFORE validating the trip, so it is never displayed.
  const impossibleTripDetectionCityEn =
    "- If the city cannot be geolocated as a real place: set \"impossible_trip\" to true and explain which location is invalid in \"reason\" (e.g. \"City 'Xyz' not found\"). Fill the remaining required trip fields with minimal values and use an empty \"days\" array."
  const impossibleTripDetectionCityIt =
    "- Se la città non può essere geolocalizzata come luogo reale: imposta \"impossible_trip\" a true e spiega quale località è non valida in \"reason\" (es. \"Città 'Xyz' non trovata\"). Compila i restanti campi obbligatori con valori minimi e usa un array \"days\" vuoto."
  const impossibleTripDetectionRoadEn =
    "- If the origin or destination cannot be geolocated as a real place: set \"impossible_trip\" to true and explain which location is invalid in \"reason\" (e.g. \"Origin 'Xyz' not found\" or \"Destination 'Xyz' not found\"). Fill the remaining required trip fields with minimal values and use an empty \"days\" array.\n"
    + "- If the origin and destination are on different continents, or require an ocean crossing, or the driving distance would exceed ~5000 km: set \"impossible_trip\" to true and explain why in \"reason\" (e.g. intercontinental, requires flight, too far). Fill the remaining required trip fields with minimal values and use an empty \"days\" array."
  const impossibleTripDetectionRoadIt =
    "- Se l'origine o la destinazione non possono essere geolocalizzate come luoghi reali: imposta \"impossible_trip\" a true e spiega quale località è non valida in \"reason\" (es. \"Origine 'Xyz' non trovata\" o \"Destinazione 'Xyz' non trovata\"). Compila i restanti campi obbligatori con valori minimi e usa un array \"days\" vuoto.\n"
    + "- Se l'origine e la destinazione sono su continenti diversi, o richiedono un attraversamento oceanico, o la distanza di guida supererebbe i ~5000 km: imposta \"impossible_trip\" a true e spiega il motivo in \"reason\" (es. intercontinentale, richiede volo, troppo lontano). Compila i restanti campi obbligatori con valori minimi e usa un array \"days\" vuoto."
  const impossibleTripDetection =
    payload.mode === "city"
      ? (locale === "en" ? impossibleTripDetectionCityEn : impossibleTripDetectionCityIt)
      : (locale === "en" ? impossibleTripDetectionRoadEn : impossibleTripDetectionRoadIt)

if (payload.mode === "city") {
    return [
      impossibleTripDetection,
      `- City: ${payload.city}`,
      `Duration: ${payload.days} days`,
      `Pace: ${PACE_CITY[payload.pace]?.[locale] ?? payload.pace}`,
      `Interests: ${(payload.interests ?? []).join(", ") || (locale === "en" ? "culture and food mix" : "mix culturale e food")}`,
      payload.notes ? `Traveller notes: ${payload.notes}` : "",
      "Rules:",
      "- Real, precise lat/lng for every stop.",
      "- Plan a complete day from 09:00 through the evening: include a balanced morning block, afternoon sightseeing, check-in at the overnight accommodation, and dinner or an evening activity. Do not end the schedule around lunchtime and do not leave unexplained gaps.",
      "- Use 5-7 meaningful stops per day when realistic, with non-overlapping durations and practical walking or public-transport transfer time between them.",
      "- When naming a city, town, or village, split it into specific landmark stops: principal monuments, viewpoints, historic districts, churches, museums, parks, or trails. Never use only the bare city name as the sightseeing stop.",
      "- For every type=pasto stop, describe the local dishes or regional specialities worth ordering at that specific location; avoid generic food descriptions.",
      "- Include practical logistics in descriptions when relevant: nearby parking, reservations, opening-time constraints, and check-in guidance.",
      "- For every type=notte stop, name must be the exact hotel or B&B shown to the user.",
      "- booking_query: exact hotel or B&B name followed by the city; never use a city/area-only search.",
      "- getyourguide_query: attraction or experience search query.",
      "- total_km_estimated = 0, estimated_fuel_cost_range = \"0€\", toll_and_vignette_alerts = [].",
      "- driving_time_minutes = 0 for each day (short urban moves).",
      "- For every type=notte stop, name must be the exact hotel or B&B shown to the user.",
      "- booking_query: exact hotel or B&B name followed by the city; never use a city/area-only search.",
      "- getyourguide_query: attraction or experience search query.",
      "- Language:",
      `- ${languageLine}`,
    ]
      .filter(Boolean)
      .join("\n")
  }

  return [
    impossibleTripDetection,
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
    "- Plan a complete day from 09:00 through the evening: include morning driving and sightseeing, afternoon stops, check-in at the overnight accommodation, and dinner or an evening activity. Do not end the schedule around lunchtime and do not leave unexplained gaps.",
    "- Use 5-7 meaningful stops per day when realistic, with non-overlapping durations and driving time consistent with driving_time_minutes between stops.",
    "- When naming a city, town, or village, split it into specific landmark stops: principal monuments, viewpoints, historic districts, churches, museums, parks, or trails. Never use only the bare city name as the sightseeing stop.",
    "- For every type=pasto stop, describe the local dishes or regional specialities worth ordering at that specific location; avoid generic food descriptions.",
    "- Include practical logistics in descriptions when relevant: nearby parking, reservations, opening-time constraints, and check-in guidance.",
    "- Include at least one type=notte stop (lodging) each day, except the last day if it is only the return.",
    "- For every type=notte stop, name must be the exact hotel or B&B shown to the user.",
    "- driving_time_minutes must match the chosen pace.",
    '- Estimate total_km_estimated and estimated_fuel_cost_range in euro (e.g. "120€ - 150€").',
    "- In toll_and_vignette_alerts list vignettes and tolls for countries crossed.",
    "- booking_query: exact hotel or B&B name followed by the city; never use a generic city or area-only search.",
    "- getyourguide_query: attraction or activity name.",
    "- Language:",
    `- ${languageLine}`,
  ]
    .filter(Boolean)
    .join("\n")
}
