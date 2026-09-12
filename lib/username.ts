import type { User } from "@supabase/supabase-js"

export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 30

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,30}$/

/**
 * Username derived from an email address: the part before "@",
 * stripped of characters outside [a-zA-Z0-9._-], capped at 30 chars.
 * Falls back to "traveler" when nothing usable remains.
 */
export function defaultUsername(email: string): string {
  const prefix = email.split("@")[0] ?? ""
  const clean = prefix.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, MAX_USERNAME_LENGTH)
  if (clean.length >= MIN_USERNAME_LENGTH) return clean
  return "traveler"
}

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(value)
}

/**
 * Best display name for a Supabase user: stored `username` metadata first,
 * then the email-derived default, then the raw email.
 */
export function displayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | null | undefined
  const stored = meta?.username
  if (typeof stored === "string" && isValidUsername(stored.trim())) return stored.trim()
  if (user.email) {
    const derived = defaultUsername(user.email)
    if (derived) return derived
    return user.email
  }
  return "Account"
}
