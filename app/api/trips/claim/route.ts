import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { isMissingTableError } from "@/lib/trips"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  const tripId = body && typeof body === "object" ? (body as { tripId?: unknown }).tripId : null
  if (typeof tripId !== "string" || !UUID_PATTERN.test(tripId)) {
    return NextResponse.json({ error: "Invalid trip id." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("saved_trips")
    .update({ user_id: user.id })
    .eq("id", tripId)
    .is("user_id", null)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("[trips] claim failed:", error)
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: "setup_required" }, { status: 503 })
    }
    return NextResponse.json({ error: "Could not claim trip" }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: "Trip not claimable" }, { status: 404 })
  return NextResponse.json({ id: data.id })
}