/**
 * Shared helpers for Supabase-native passkey (WebAuthn) flows.
 *
 * Both `signInWithPasskey()` and `registerPasskey()` return
 * `{ data, error }` instead of throwing for ceremony failures, so callers
 * must inspect `error`. Two error families exist:
 * - Server `AuthError`s with a machine-readable `code` (`passkey_disabled`,
 *   `email_not_confirmed`, `webauthn_credential_not_found`, ...).
 * - Client `WebAuthnError`s wrapping the browser DOMException. A dismissed
 *   prompt surfaces as `NotAllowedError`/`AbortError` (directly as `name`,
 *   or nested in `cause`, or as `ERROR_CEREMONY_ABORTED`) and must stay
 *   silent — the user simply changed their mind.
 */

/** Lowercased machine-readable `code` of an error, or `""`. */
export function getPasskeyErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return ""
  return String((error as { code?: unknown }).code ?? "").toLowerCase()
}

/**
 * True when the user dismissed the browser passkey prompt (or the ceremony
 * was aborted). Callers should reset pending state and show nothing.
 */
export function isPasskeyCancelled(error: unknown): boolean {
  let current: unknown = error
  const seen = new Set<unknown>()
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current)
    const record = current as { name?: unknown; code?: unknown; cause?: unknown }
    const name = String(record.name ?? "")
    if (name === "NotAllowedError" || name === "AbortError") return true
    if (String(record.code ?? "") === "ERROR_CEREMONY_ABORTED") return true
    current = record.cause
  }
  return false
}
