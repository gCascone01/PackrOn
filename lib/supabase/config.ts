/**
 * Supabase configuration helpers.
 *
 * Security notes:
 * - `NEXT_PUBLIC_SUPABASE_URL` + the public key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
 *   formerly `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are public by design (they only
 *   grant what RLS policies allow). They are safe to expose to the browser.
 * - Secret / service-role keys must NEVER be exposed to the client. This
 *   codebase does not need them: all trip reads/writes run as the logged-in
 *   user via RLS.
 * - Until the Supabase project is created, these env vars will be missing.
 *   `isSupabaseConfigured()` lets the UI degrade gracefully (auth controls
 *   explain setup instead of crashing) while the rest of the app keeps working.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseUrl().length > 0 && getSupabasePublishableKey().length > 0
}

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
}

/**
 * Public API key for the browser + server clients.
 * Prefers the new `sb_publishable_...` key, falls back to the legacy `anon`
 * key — both are accepted by the current `@supabase/ssr` / `@supabase/supabase-js`.
 */
export function getSupabasePublishableKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
}

/** @deprecated Use `getSupabasePublishableKey()` — kept for backward compatibility. */
export function getSupabaseAnonKey(): string {
  return getSupabasePublishableKey()
}
