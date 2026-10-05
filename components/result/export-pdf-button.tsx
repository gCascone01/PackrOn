"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { tripPdfFilename } from "@/lib/trip-pdf"
import type { Itinerary } from "@/lib/types"

/**
 * "Export PDF" — builds a printable itinerary client-side with
 * `@react-pdf/renderer`. Both the renderer and the document component are
 * dynamically imported on first click, so the heavy PDF engine never lands
 * in the main bundle and stays out of the server render.
 */
export function ExportPdfButton({
  itinerary,
  totalKm,
  totalStops,
}: {
  itinerary: Itinerary
  totalKm: number
  totalStops: number
}) {
  const { t, locale } = useI18n()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportPdf = async () => {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const [{ pdf }, { TripPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./trip-pdf-document"),
      ])
      const blob = await pdf(
        <TripPdfDocument
          itinerary={itinerary}
          locale={locale}
          totalKm={totalKm}
          totalStops={totalStops}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = tripPdfFilename(itinerary.title)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[pdf] export failed:", err)
      setError(t("pdfExportFail"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <Button
        variant="outline"
        size="lg"
        className="shrink-0"
        onClick={() => void exportPdf()}
        disabled={pending}
        title={t("pdfExport")}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
        {pending ? t("pdfExporting") : t("pdfExport")}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
