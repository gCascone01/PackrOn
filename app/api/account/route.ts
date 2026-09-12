import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

/**
 * DELETE /api/account — permanently deletes the logged-in user's account.
 *
 * - Calls the `delete_own_account()` SECURITY DEFINER function, which deletes
 *   ONLY the caller's auth.users row (saved trips cascade). No service-role
 *   key is used anywhere; authorization comes from the session (auth.uid()).
 * - Signs out afterwards so no stale session cookies remain.
 * - Irreversible: the client requires typed-username confirmation first.
 */
export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase.rpc("delete_own_account")
  if (error) {
    console.error("[account] delete failed:", error)
    // PGRST202 = function not found → the delete_own_account migration was
    // never run. Uses its own machine-readable code (distinct from the trips
    // `setup_required`) so the UI points at the delete migration, not the
    // saved_trips migration.
    if ((error as { code?: string }).code === "PGRST202") {
      return NextResponse.json({ error: "account_setup_required" }, { status: 503 })
    }
    return NextResponse.json({ error: "Could not delete account" }, { status: 500 })
  }

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
