"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { ResultView } from "@/components/result/result-view"
import { HomeCta } from "@/components/marketing-shell"
import { useI18n } from "@/components/locale-provider"
import { decodeItinerary, readShareTokenFromLocation } from "@/lib/share"
import type { Itinerary } from "@/lib/types"

export function SharedItineraryPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "invalid">("loading")

  useEffect(() => {
    let cancelled = false
    const token = readShareTokenFromLocation()
    if (!token) {
      setStatus("invalid")
      return
    }
    decodeItinerary(token).then((decoded) => {
      if (cancelled) return
      if (!decoded) {
        setStatus("invalid")
        return
      }
      setItinerary(decoded)
      setStatus("ready")
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">{t("sharedLoading")}</main>
      </div>
    )
  }

  if (status === "invalid" || !itinerary) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <p className="text-base text-muted-foreground">{t("sharedInvalid")}</p>
          <div className="mt-6">
            <HomeCta label="howCta" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader onBrandClick={() => router.push("/")} />
      <ResultView initial={itinerary} onBack={() => router.push("/")} />
    </div>
  )
}
