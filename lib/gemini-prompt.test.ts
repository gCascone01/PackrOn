import { describe, expect, it } from "vitest"
import { buildTripPrompt } from "./gemini-prompt"
import type { GenerateTripPayload } from "./types"

const exampleRoadPayload: GenerateTripPayload = {
  mode: "road",
  origin: "Scafati",
  destination: "Lecce",
  days: 4,
  pace: "balanced",
  locale: "it",
  loop: false,
  basecamp: false,
  crew: ["couple"],
  routeTags: [],
  vehicle: "diesel",
  consumption: 6.5,
  avoidTolls: false,
}

const expectedRoadPrompt = `You are an expert European road-trip planner. Generate a realistic itinerary with coherent distances and driving times.
Be permissive when interpreting origin and destination names: they might be misspelled. Plan the trip using the corrected names.
Only if, after best-effort interpretation, the origin or destination is not a real place: set "impossible_trip" to true, set "error_code" to "invalid_origin" or "invalid_destination" as appropriate, and explain which location is invalid in "reason" (e.g. "Origin 'Xyz' not found" or "Destination 'Xyz' not found"). Fill the remaining required trip fields with minimal values and use an empty "days" array. Never flag a trip as impossible for a minor misspelling.
Refuse a trip for geography only when it truly needs a flight: continents with neither a drivable land connection nor a ferry link (e.g. Europe–America across the Atlantic, Europe–Australia). Set "impossible_trip" to true, set "error_code" to "impossible", and explain why in "reason" (e.g. intercontinental with no land or ferry connection, requires flight). Fill the remaining required trip fields with minimal values and use an empty "days" array.
Seas with ferry connections are normal road-trip territory: the Mediterranean is crossable (e.g. Italy–Greece, Italy–Tunisia ferries) and can also be driven around via the Balkans and Turkey — e.g. Milan–Cairo is a valid road trip. Plan such routes overland and/or with ferry legs stated explicitly in the itinerary, plus border/visa warnings in the relevant stop descriptions. Never call the Mediterranean uncrossable, and do NOT impose any distance limit: long road trips are valid.
Never refuse a trip just because the duration is generous for the distance (e.g. 30 days for ~2500 km): extra days mean scenic detours, rest days, and deeper exploration. Pace is a daily maximum, not a quota to fill — plan shorter driving days and more time per stop.
Border, visa, vehicle-permit, or geopolitical complexity is never a reason to refuse: always plan the route and surface crossing requirements and practical warnings in the relevant stop descriptions. Likewise, 'extensive distance' or 'typical planning parameters' are never refusal reasons — you impose no distance limit.
Origin: Scafati
The origin is only the starting point: do not plan sightseeing stops there, depart directly.
Destinations / areas: Lecce
Duration: 4 days
Type: one way
Stays: new city every night
Pace: balanced
Crew: Couple
Route style: mix
Vehicle: diesel
Declared consumption: 6.5 L/100km (or kWh/100km if EV)
Tolls: motorways allowed if convenient
CRITICAL STRUCTURAL & SCHEDULING RULES:

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

describe("buildTripPrompt", () => {
  it("returns the user's road-trip prompt verbatim with live form values substituted", () => {
    expect(buildTripPrompt(exampleRoadPayload)).toBe(expectedRoadPrompt)
  })

  it("uses the road prompt identically for either app locale", () => {
    const italianPrompt = buildTripPrompt(exampleRoadPayload)
    const englishPrompt = buildTripPrompt({ ...exampleRoadPayload, locale: "en" })

    expect(italianPrompt).toBe(englishPrompt)
  })

  it("substitutes the current form values, including selected route styles", () => {
    const prompt = buildTripPrompt({
      ...exampleRoadPayload,
      origin: "Porto",
      destination: "Lisbon",
      days: 4,
      loop: true,
      basecamp: true,
      pace: "fast",
      crew: ["couple", "dog"],
      routeTags: ["coast", "villages"],
      vehicle: "elettrica",
      consumption: 18,
      avoidTolls: true,
    })

    expect(prompt).toContain("Origin: Porto")
    expect(prompt).toContain("Destinations / areas: Lisbon")
    expect(prompt).toContain("Duration: 4 days")
    expect(prompt).toContain("Type: loop")
    expect(prompt).toContain("Stays: fixed basecamp with day trips")
    expect(prompt).toContain("Pace: intense")
    expect(prompt).toContain("Crew: Couple, With a dog")
    expect(prompt).toContain("Route style: Scenic coasts, Villages & castles")
    expect(prompt).toContain("Vehicle: electric")
    expect(prompt).toContain("Declared consumption: 18 L/100km (or kWh/100km if EV)")
    expect(prompt).toContain("Tolls: avoid motorways and toll roads")
    expect(prompt).not.toContain("Scafati")
    expect(prompt).not.toContain("Destinations / areas: Lecce")
  })

  it("adds a charging plan for electric cars with a declared range", () => {
    const prompt = buildTripPrompt({
      ...exampleRoadPayload,
      vehicle: "elettrica",
      consumption: 18,
      evRangeKm: 320,
    })

    expect(prompt).toContain("Vehicle: electric")
    expect(prompt).toContain("Real EV range: 320 km")
    expect(prompt).toContain("type=ricarica")
  })

  it("omits the charging plan without a declared range or for fossil cars", () => {
    expect(buildTripPrompt(exampleRoadPayload)).not.toContain("type=ricarica")
    expect(
      buildTripPrompt({ ...exampleRoadPayload, vehicle: "elettrica", consumption: 18 }),
    ).not.toContain("type=ricarica")
  })

  it("keeps the city-trip prompt separate", () => {
    const cityPrompt = buildTripPrompt({
      mode: "city",
      city: "Rome",
      days: 2,
      pace: "balanced",
      locale: "en",
    })

    expect(cityPrompt).toContain("City: Rome")
    expect(cityPrompt).not.toContain("You are an expert European road-trip planner")
  })
})