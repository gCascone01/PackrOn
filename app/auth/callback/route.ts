import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * PKCE callback for Supabase Auth (email confirmation, OAuth, magic link).
 * Supabase redirects here with `?code=...`; we exchange it for a session
 * (httpOnly cookies) and bounce back to the localized `next` path.
 * This route is intentionally NOT locale-prefixed.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/en"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/en?auth_error=1`)
}
