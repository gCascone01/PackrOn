import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { isMissingTableError, validateSaveTripPayload, type SavedTrip } from "@/lib/trips"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/**
 * GET /api/trips/[id] — load one saved itinerary (owner only, via RLS).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 })
  }
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data, error } = await supabase
    .from("saved_trips")
    .select("id,user_id,title,mode,origin,data,created_at,updated_at")
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error) console.error("[trips] get failed:", error)
    if (error && isMissingTableError(error)) {
      return NextResponse.json({ error: "setup_required" }, { status: 503 })
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ trip: data as SavedTrip })
}

/**
 * PUT /api/trips/[id] — overwrite a saved itinerary (owner only, via RLS).
 * Body: { itinerary: Itinerary }. Used when re-saving an edited trip so no
 * duplicate record is created. 404 when the id is foreign or missing.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 })
  }
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

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
    .update({
      title: itinerary.title.trim().slice(0, 160),
      mode: itinerary.mode,
      origin: typeof itinerary.origin === "string" ? itinerary.origin.slice(0, 200) : "",
      data: itinerary,
    })
    .eq("id", id)
    .select("id")
    .single()

  if (error || !data) {
    if (error) console.error("[trips] update failed:", error)
    if (error && isMissingTableError(error)) {
      return NextResponse.json({ error: "setup_required" }, { status: 503 })
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ id: (data as { id: string }).id })
}

/**
 * DELETE /api/trips/[id] — delete a saved trip (owner only, via RLS).
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 })
  }
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { error, count } = await supabase.from("saved_trips").delete({ count: "exact" }).eq("id", id)

  if (error) {
    console.error("[trips] delete failed:", error)
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: "setup_required" }, { status: 503 })
    }
    return NextResponse.json({ error: "Could not delete trip" }, { status: 500 })
  }
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
