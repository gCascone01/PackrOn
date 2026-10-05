import type { GenerateTripPayload } from "./types"
import type { Locale } from "./i18n"

const PACE_CITY: Record<string, { it: string; en: string }> = {
  chill: { it: "poche tappe, con calma", en: "few stops, unhurried" },
  balanced: { it: "mix equilibrato", en: "balanced mix" },
  packed: { it: "vedere il più possibile", en: "see as much as possible" },
}

function localeOf(payload: GenerateTripPayload): Locale {
  return payload.locale === "it" ? "it" : "en"
}

const CREW_EN: Record<string, string> = {
  solo: "Solo",
  couple: "Couple",
  family: "Family with kids",
  friends: "Friends",
  dog: "With a dog",
  coppia: "Couple",
  "famiglia con bimbi": "Family with kids",
  "gruppo amici": "Friends",
  "con cane": "With a dog",
}

const VEHICLE_EN: Record<string, string> = {
  benzina: "petrol",
  diesel: "diesel",
  elettrica: "electric",
  camper: "camper/van",
  moto: "motorcycle",
}

const ROUTE_STYLE_EN: Record<string, string> = {
  alpine: "Alpine passes & curves",
  villages: "Villages & castles",
  nature: "Nature & parks",
  coast: "Scenic coasts",
}

export function buildTripPrompt(payload: GenerateTripPayload): string {
  const locale = localeOf(payload)
  const languageLine =
    "IMPORTANT LANGUAGE RULE: write every user-facing text field in English. This includes trip_title, summary, day titles, main-stop and substop names when a translated name exists, short_description, booking_query, getyourguide_query, and toll alerts. Keep only official local proper names unchanged. No markdown."

  // --- IMPOSSIBLE TRIP DETECTION (CITY MODE) ---
  const impossibleTripDetectionCityEn =
    "- Be maximally permissive when interpreting the city: auto-correct obvious typos, missing/extra/swapped letters, missing accents or diacritics, transliterations, and alternative names in any language (e.g. 'Seville' = 'Siviglia', 'Rmoa' = 'Roma'). Plan the trip for the corrected city.\n"
    + "- Only if, after best-effort interpretation, the input is clearly not a real visitable place (gibberish such as 'Xyzq', fictional places, empty or non-place concepts): set \"impossible_trip\" to true, set \"error_code\" to \"invalid_city\", and explain which location is invalid in \"reason\" (e.g. \"City 'Xyz' not found\"). Fill the remaining required trip fields with minimal values and use an empty \"days\" array. Never flag a trip as impossible for a minor misspelling."
  const impossibleTripDetectionCityIt =
    "- Sii il più permissivo possibile nell'interpretare la città: correggi automaticamente refusi evidenti, lettere mancanti/in più/invertite, accenti mancanti, traslitterazioni e nomi alternativi in qualsiasi lingua (es. 'Seville' = 'Siviglia', 'Rmoa' = 'Roma'). Pianifica il viaggio per la città corretta.\n"
    + "- Solo se, dopo aver interpretato l'input al meglio, risulta chiaramente che non è un luogo reale visitabile (stringhe senza senso come 'Xyzq', luoghi inventati, input vuoto o concetti non geografici): imposta \"impossible_trip\" a true, imposta \"error_code\" a \"invalid_city\", e spiega quale località è non valida in \"reason\" (es. \"Città 'Xyz' non trovata\"). Compila i restanti campi obbligatori con valori minimi e usa un array \"days\" vuoto. Non segnalare mai come impossibile un viaggio per un piccolo errore di ortografia."
  const impossibleTripDetection =
    payload.mode === "city"
      ? (locale === "en" ? impossibleTripDetectionCityEn : impossibleTripDetectionCityIt)
      : ""

if (payload.mode === "city") {
    return [
      impossibleTripDetection,
      `- City: ${payload.city}`,
      `Duration: ${payload.days} days`,
      `Pace: ${PACE_CITY[payload.pace]?.[locale] ?? payload.pace}`,
      `Interests: ${(payload.interests ?? []).join(", ") || (locale === "en" ? "culture and food mix" : "mix culturale e food")}`,
      payload.notes ? `Traveller notes: ${payload.notes}` : "",
      "Rules:",
      "- Do not add specific calendar dates; use relative day numbers only.",
      "- Every day.stops item is one MAIN STOP with name, type, start_time, end_time, short_description, and sub_stops. Use 24-hour HH:MM local times, schedule every main stop in a continuous coherent daily sequence, and never leave a long unexplained gap or an empty afternoon/evening. Extend worthwhile activities through sunset and nighttime, then place the exact lodging check-in last.",
      "- Keep each broader experience as one main stop; do not split its constituent activities into duplicate top-level stops. Put specific landmarks and things to see/do/try in that main stop's sub_stops array. Each substop includes a name, a type (walk, landmark, museum, food, church, viewpoint, or other), and a concise concrete description in English. Substops have no time or duration.",
      "- Attach each booking_query or getyourguide_query to the specific substop it describes. Use getyourguide_query for the relevant attraction/activity. Use booking_query only for an exact hotel or B&B name followed by its city, never a generic city/area search.",
      "- Meal stops use type=breakfast for breakfast and type=pasto for lunch or dinner. Do not add sub_stops to meals; name specific local dishes and regional specialities directly in the meal main stop's short_description.",
      "- Every non-drive main stop needs real, precise lat/lng. A drive main stop uses type=drive and must omit lat/lng or set both to null.",
      "- Every main stop has precise start_time and end_time. Set duration_minutes to the elapsed activity length; omit duration_minutes for type=notte. A notte stop's name is the exact hotel or B&B shown to the user, and its time interval represents the planned check-in window.",
      "- Include one type=notte stop for each requested overnight stay, using a different exact hotel/B&B each night when requested.",
      "- Real, precise lat/lng for every located main stop.",
      "- For a normal full day, plan a coherent progression through meaningful morning, midday, afternoon, and evening experiences, including dinner and the requested overnight stay.",
      "- Avoid unexplained conceptual gaps. Meals, lodging, transfers, and other logistics should support the day rather than replace meaningful experiences.",
      "- Choose realistic duration_minutes for the type and scale of each experience. Do not artificially extend an activity to fill the day; a substantial attraction may last several hours. If the day is under-filled, add another relevant meaningful experience rather than inflating durations.",
      "- Before ending each day, check whether it is coherent for its context and pace, covers its main meaningful experiences, and leaves a substantial portion of usable time unexplained. If no arrival, transfer, departure, return, driving, rest, destination, opening-hours, or travel constraint justifies ending early, add another meaningful and geographically coherent experience. Never add filler solely to consume time.",
      "- Generate enough meaningful experiences to naturally occupy the day according to its context and pace. Do not use a fixed stop count as the definition of completeness.",
      "- Relaxed/chill pace means lower activity density, longer visits, and more transition time; balanced pace means normal meaningful activity coverage; packed pace adds experiences only when geographically and logistically realistic. Never use fixed stop counts to define pace.",
      `- Generate exactly ${payload.days} entries in "days", one per trip day in order — never fewer, even for long trips.`,
      "- Distribute meaningful experiences, meals, lodging, rest, and logistics appropriately across every requested day. Do not compress the trip into a few dense days or add repetitive filler.",
      "- The first day may be shorter when arrival, transfer, or check-in logistics justify it. The final day may be shorter when it is primarily departure or return travel. Do not add filler sightseeing just to make either day longer.",
      "- When naming a city, town, or village, split it into specific landmark stops: principal monuments, viewpoints, historic districts, churches, museums, parks, or trails. Never use only the bare city name as the sightseeing stop.",
      "- For every type=pasto stop, describe the local dishes or regional specialities worth ordering at that specific location; avoid generic food descriptions.",
      "- Include practical logistics in descriptions when relevant: nearby parking, reservations, opening-time constraints, and check-in guidance.",
      "- booking_query: exact hotel or B&B name followed by the city; never use a city/area-only search.",
      "- total_km_estimated = 0, estimated_fuel_cost_range = \"0€\", toll_and_vignette_alerts = [].",
      "- driving_time_minutes = 0 for each day (short urban moves).",
      "- Language:",
      `- ${languageLine}`,
    ]
      .filter(Boolean)
      .join("\n")
  }

  const crew = (payload.crew ?? []).map((person) => CREW_EN[person.toLowerCase()] ?? person).join(", ") || "unspecified"
  const vehicle = VEHICLE_EN[(payload.vehicle ?? "diesel").toLowerCase()] ?? payload.vehicle ?? "diesel"
  const pace = ({ relax: "relaxed", balanced: "balanced", fast: "intense" } as Record<string, string>)[payload.pace] ?? payload.pace
  const type = payload.loop ? "loop" : "one way"
  const stays = payload.basecamp ? "fixed basecamp with day trips" : "new city every night"
  const routeStyle = (payload.routeTags ?? []).map((tag) => ROUTE_STYLE_EN[tag] ?? tag).join(", ") || "mix"
  const consumption = payload.consumption ?? (vehicle === "electric" ? 18 : 6.5)
  const tolls = payload.avoidTolls ? "avoid motorways and toll roads" : "motorways allowed if convenient"
  const evRangeRaw = vehicle === "electric" ? Number(payload.evRangeKm) : NaN
  const evRangeKm = Number.isFinite(evRangeRaw) && evRangeRaw >= 50 && evRangeRaw <= 1500 ? Math.round(evRangeRaw) : null
  const evChargingLine = evRangeKm
    ? `Real EV range: ${evRangeKm} km on a full charge. Plan type=ricarica charging stops so that no driving leg between charges exceeds this range (keep a safety margin on long days). Each ricarica stop is a MAIN STOP with real station coordinates (lat/lng), precise start_time/end_time, duration_minutes for the charging session, and a short_description naming the charger power (kW) and network when known; do not use sub_stops for ricarica stops. Prefer fast chargers on transit legs; combine charging with a meal or sightseeing break when convenient. An overnight (notte) stop implies slow destination charging where available.`
    : ""

  return `You are an expert European road-trip planner. Generate a realistic itinerary with coherent distances and driving times.
Be permissive when interpreting origin and destination names: they might be misspelled. Plan the trip using the corrected names.
Only if, after best-effort interpretation, the origin or destination is not a real place: set "impossible_trip" to true, set "error_code" to "invalid_origin" or "invalid_destination" as appropriate, and explain which location is invalid in "reason" (e.g. "Origin 'Xyz' not found" or "Destination 'Xyz' not found"). Fill the remaining required trip fields with minimal values and use an empty "days" array. Never flag a trip as impossible for a minor misspelling.
Refuse a trip for geography only when it truly needs a flight: continents with neither a drivable land connection nor a ferry link (e.g. Europe–America across the Atlantic, Europe–Australia). Set "impossible_trip" to true, set "error_code" to "impossible", and explain why in "reason" (e.g. intercontinental with no land or ferry connection, requires flight). Fill the remaining required trip fields with minimal values and use an empty "days" array.
Seas with ferry connections are normal road-trip territory: the Mediterranean is crossable (e.g. Italy–Greece, Italy–Tunisia ferries) and can also be driven around via the Balkans and Turkey — e.g. Milan–Cairo is a valid road trip. Plan such routes overland and/or with ferry legs stated explicitly in the itinerary, plus border/visa warnings in the relevant stop descriptions. Never call the Mediterranean uncrossable, and do NOT impose any distance limit: long road trips are valid.
Never refuse a trip just because the duration is generous for the distance (e.g. 30 days for ~2500 km): extra days mean scenic detours, rest days, and deeper exploration. Pace is a daily maximum, not a quota to fill — plan shorter driving days and more time per stop.
Border, visa, vehicle-permit, or geopolitical complexity is never a reason to refuse: always plan the route and surface crossing requirements and practical warnings in the relevant stop descriptions. Likewise, 'extensive distance' or 'typical planning parameters' are never refusal reasons — you impose no distance limit.
Origin: ${payload.origin ?? ""}
The origin is only the starting point: do not plan sightseeing stops there, depart directly.
Destinations / areas: ${payload.destination ?? ""}
Duration: ${payload.days} days
Type: ${type}
Stays: ${stays}
Pace: ${pace}
Crew: ${crew}
Route style: ${routeStyle}
Vehicle: ${vehicle}
Declared consumption: ${consumption} L/100km (or kWh/100km if EV)
Tolls: ${tolls}
${evChargingLine ? `${evChargingLine}\n` : ""}CRITICAL STRUCTURAL & SCHEDULING RULES:

No Hardcoded Dates: Do not add specific calendar dates to the itinerary days; use a relative day structure instead.
Streamlined Departures: Combine the initial origin departure and the first driving leg into a single, cohesive driving entry (e.g., "Drive from [Origin] to [First Stop]") rather than splitting them into separate micro-steps.
Maximized Daily Engagement & Late Evening Extension (Full Schedules): Never leave long empty blocks, early afternoon hotel check-ins, or passive downtime. The evening is fully part of the holiday and must never be left empty. Fill every afternoon and evening with rich activities right through the dusk and nighttime hours—such as sunset viewpoints, atmospheric evening city walks, dinner spots, gelaterias, or cultural night experiences. Ensure the itinerary naturally extends well after dark to capture the evening ambiance before the final hotel check-in.
Strict Separation of Evening Activities and Accommodations: Never merge evening sightseeing, walks, or nightlife into the description of the hotel stay (type=notte). Any evening walk or activity MUST be scheduled as its own distinct MAIN STOP placed before the final check-in.
Main Stops and Substops (Avoid Duplication): Do not create multiple top-level stops for activities that are part of the same broader experience. Instead, create a MAIN STOP (e.g., "Explore Brussels Historic Center" or "Visit the European Parliament") and include a substops array within it.
Comprehensive Substops for Long Activities: The level of detail in the substops array must organically reflect the duration and scale of the MAIN STOP. For multi-hour activities (like exploring a large archaeological park, a sprawling museum, or a city center), break down the experience into multiple distinct substops that realistically fill the time (e.g., individual temples, specific notable ruins, distinct neighborhoods, or key exhibits). Do not summarize a massive, time-intensive location into a single, generic substop.
The MAIN STOP must contain the overall start_time, end_time, and duration_minutes, as well as latitude and longitude.
The SUBSTOPS must list the specific things to see, do, or try within that main stop (e.g., "Visit Grand Place", "Try a waffle"). Each substop must also include a type (walk, landmark, museum, food, church, viewpoint, or other) and a concise, concrete description in English. Substops do not have time or duration fields.
Substop Bookings: Attach booking_query or getyourguide_query to the specific substop they belong to (e.g., a "Guided tour of the Parliament" substop should have the GetYourGuide query), rather than attaching a generic booking option to the whole Main Stop.
Curated High-Value Bookable Experiences (GetYourGuide Integration): Suggest specific, bookable experiences (e.g., guided walking tours, skip-the-line museum tickets, boat excursions, local food tasting tours) only when they genuinely enhance the traveler's experience. Attach a precise getyourguide_query to a substop when the attraction is historically complex and benefits from a local guide, when skip-the-line tickets save significant time, or when it represents a unique regional activity (e.g., "Sassi di Matera sunset walking tour", "Lecce Baroque guided tour"). Do not spam every stop with a tour; avoid suggesting bookings for easily self-navigated public squares, viewpoints, or basic walks. Every suggestion must feel highly relevant and worth the user's money.
Drive Coordinates: For MAIN STOPS of type drive, omit or set the latitude and longitude fields to null, since a drive represents a route, not a specific point.
Precise Timing: Assign precise clock times to every single MAIN STOP in the itinerary (e.g., 08:00 - 10:30, 10:30 - 11:15, etc.), creating a continuous, coherent daily schedule from morning until night.
Meal Types: Use precise meal type categories where applicable, such as "breakfast" and "pasto" (for lunch/dinner) for daily meals. Do not use the substops array for meal/breakfast stops; instead, seamlessly integrate the specific dishes or courses into the main stop's description.
Night Stays: For overnight stay stops (type=notte), do NOT include a duration_minutes value (or set it to 0/null), as they represent check-in and resting time rather than a timed activity block. The description for type=notte stops must ONLY describe the accommodation itself, not surrounding activities.
RULES:

Real, precise lat/lng for non-drive MAIN STOPS.
Every day must be filled and highly detailed, in respect of the "Pace" selected from the user.
Make a complete itinerary: use the Substop structure to ensure if you suggest a city, you also provide specific landmarks indicating what to visit there. Include breaks when necessary, and include suggestions for breakfast, lunch and dinner.
Consider the logistics (e.g. check-in or check-out). Include them in the descriptions when relevant (e.g. nearby parking, reservation, opening times, etc.)
For every type=pasto or breakfast stop, describe the local dishes or regional specialities worth ordering at that specific location directly in the short_description; avoid generic food descriptions. Do not use substops for food/meal stops.
For every type=notte stop, name must be the exact hotel or B&B shown to the user.
Estimate total_km_estimated and estimated_fuel_cost_range in euro (e.g. "120€ - 150€").
In toll_and_vignette_alerts list vignettes and tolls for countries crossed.
booking_query: exact hotel or B&B name followed by the city; never use a generic city or area-only search.
getyourguide_query: attraction or activity name.
IMPORTANT LANGUAGE RULE: write every user-facing text field in English. This includes trip_title, summary, day titles, stop/substop names when a translated name exists, short_description, booking_query, getyourguide_query, and toll alerts. Keep only official local proper names unchanged. No markdown.`
}
