import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { getSupabasePublishableKey, getSupabaseUrl, isSupabaseConfigured } from "./config"

/**
 * Refreshes the Supabase Auth session on every request (Next 16 `proxy.ts`
 * convention) and returns the response to continue the chain.
 *
 * - If Supabase env vars are missing (project not linked yet), it simply
 *   passes through so the app keeps working without auth.
 * - Cookies stay httpOnly + Secure (in production) + SameSite=Lax;
 *   tokens are never exposed to client JS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  if (!isSupabaseConfigured()) {
    return response
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Refreshes the session when expired; no-op when logged out.
  // Errors (e.g. invalid refresh token) must not break navigation.
  try {
    await supabase.auth.getUser()
  } catch {
    // Intentionally ignored — user is treated as logged out.
  }

  return response
}
