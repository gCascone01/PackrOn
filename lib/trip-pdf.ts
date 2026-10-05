/**
 * Human-friendly filename for the exported PDF, built from the trip title:
 * `PackrOn - Seville in 3 days.pdf`. The title keeps its original casing and
 * spaces; only characters that are illegal in filenames (`\ / : * ? " < > |`)
 * are removed and runs of whitespace are collapsed. Capped at 60 chars of
 * title. Falls back to `PackrOn - Trip.pdf` for empty titles.
 */
export function tripPdfFilename(title: string): string {
  const clean = title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim()
  return `PackrOn - ${clean || "Trip"}.pdf`
}
