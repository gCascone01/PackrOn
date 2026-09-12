"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublishableKey, getSupabaseUrl } from "./config"

/**
 * Browser-side Supabase client (Supabase Auth with PKCE).
 *
 * - Session is stored in httpOnly cookies managed by `@supabase/ssr`,
 *   never in localStorage, so JS (and XSS) cannot steal tokens.
 * - Passwords are sent over TLS directly to Supabase Auth (GoTrue), which
 *   stores only bcrypt hashes. This app never sees or stores passwords.
 * - Passkey (WebAuthn) API is opted in via `auth.experimental.passkey`
 *   (Supabase-native beta: no custom crypto, no extra tables, no
 *   service-role key — Supabase Auth stores the public keys and issues
 *   the session). Requires passkeys enabled in the Supabase dashboard.
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: { experimental: { passkey: true } },
  })
}
