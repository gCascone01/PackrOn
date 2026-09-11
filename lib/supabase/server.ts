import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getSupabasePublishableKey, getSupabaseUrl } from "./config"

/**
 * Server-side Supabase client for Route Handlers / Server Components.
 *
 * - Reads/writes the httpOnly auth cookies (`sb-*-auth-token`, Secure in
 *   production, SameSite=Lax) via `next/headers` cookies().
 * - Every query runs as the logged-in user, so Postgres RLS policies
 *   (`auth.uid() = user_id`) are enforced. No service-role bypass.
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Middleware refreshes the session instead — safe to ignore.
        }
      },
    },
  })
}
