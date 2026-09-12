import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { isMissingTableError, toSavedTripSummary, validateSaveTripPayload, type SavedTrip } from "@/lib/trips"

/**
 * GET /api/trips — list the logged-in user's saved trips (summaries only).
 * 401 when logged out or when Supabase is not configured. Never leaks data.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("saved_trips")
    .select("id,user_id,title,mode,origin,data,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("[trips] list failed:", error)
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: "setup_required" }, { status: 503 })
    }
    return NextResponse.json({ error: "Could not load trips" }, { status: 500 })
  }
  const trips = (data as SavedTrip[]).map(toSavedTripSummary)
  return NextResponse.json({ trips })
}

/**
 * POST /api/trips — save an itinerary to the logged-in user's account.
 * Body: { itinerary: Itinerary }. user_id is forced from the session.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const validated = validateSaveTripPayload(body)
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }
  const { itinerary } = validated

  const { data, error } = await supabase
    .from("saved_trips")
    .insert({
      user_id: user.id,
      title: itinerary.title.trim().slice(0, 160),
      mode: itinerary.mode,
      origin: typeof itinerary.origin === "string" ? itinerary.origin.slice(0, 200) : "",
      data: itinerary,
    })
    .select("id")
    .single()

  if (error || !data) {
    if (error) console.error("[trips] save failed:", error)
    if (error && isMissingTableError(error)) {
      return NextResponse.json({ error: "setup_required" }, { status: 503 })
    }
    return NextResponse.json({ error: "Could not save trip" }, { status: 500 })
  }
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 })
}
