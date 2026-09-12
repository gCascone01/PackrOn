import type { Stop } from "./types"

/**
 * Puts the previously-chosen stop back on top of freshly fetched
 * alternatives so the user can revert a replacement. Dedupes by id: when
 * the previous stop is already among the alternatives it is left in place.
 */
export function withPreviousStop(alts: Stop[], prev: Stop | null): Stop[] {
  if (!prev) return alts
  if (alts.some((a) => a.id === prev.id)) return alts
  return [prev, ...alts]
}
