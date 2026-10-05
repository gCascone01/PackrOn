/**
 * Slugify a trip title for the exported PDF filename:
 * `packron-seville-in-3-days.pdf`. Diacritics are stripped, anything
 * non-alphanumeric becomes a dash, capped at 60 chars. Falls back to
 * `packron-trip.pdf` for empty/punctuation-only titles.
 */
export function tripPdfFilename(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "")
  return `packron-${slug || "trip"}.pdf`
}
