"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { ResultView } from "@/components/result/result-view"
import { HomeCta } from "@/components/marketing-shell"
import { useI18n } from "@/components/locale-provider"
import { decodeItinerary, isItinerary, readShareTokenFromLocation } from "@/lib/share"
import { localizedPath } from "@/lib/paths"
import type { Itinerary } from "@/lib/types"

export function SharedItineraryPage({ shareId }: { shareId?: string }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const homeHref = localizedPath(locale, "/")
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "invalid">("loading")

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (shareId) {
        try {
          const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`)
          const data = (await res.json()) as { itinerary?: Itinerary }
          if (cancelled) return
          if (!res.ok || !isItinerary(data.itinerary)) {
            setStatus("invalid")
            return
          }
          setItinerary(data.itinerary)
          setStatus("ready")
          return
        } catch {
          if (!cancelled) setStatus("invalid")
          return
        }
      }

      const token = readShareTokenFromLocation()
      if (!token) {
        setStatus("invalid")
        return
      }
      const decoded = await decodeItinerary(token)
      if (cancelled) return
      if (!decoded) {
        setStatus("invalid")
        return
      }
      setItinerary(decoded)
      setStatus("ready")
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [shareId])

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
      <SiteHeader onBrandClick={() => router.push(homeHref)} />
      <ResultView initial={itinerary} onBack={() => router.push(homeHref)} />
    </div>
  )
}
