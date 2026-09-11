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
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey())
}
