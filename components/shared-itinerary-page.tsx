"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { ResultView } from "@/components/result/result-view"
import { TripHero } from "@/components/result/trip-hero"
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

  const heroStops = itinerary.days.flatMap((day) =>
    day.stops.map((stop, index) => ({
      ...stop,
      seq: index + 1,
      dayNumber: day.dayNumber,
    })),
  )

  const originPoint =
    itinerary.origin && itinerary.originLat && itinerary.originLng
      ? { lat: itinerary.originLat, lng: itinerary.originLng, name: itinerary.origin }
      : undefined

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30">
      <SiteHeader onBrandClick={() => router.push(homeHref)} />

      <TripHero
        title={itinerary.title}
        subtitle={itinerary.subtitle}
        daysCount={itinerary.days.length}
        tripTypeLabel={itinerary.mode === "road" ? t("modeRoadTitle") : t("modeCityTitle")}
        highlights={itinerary.days.map((day) => day.title)}
        mode={itinerary.mode}
        stops={heroStops}
        origin={originPoint}
        scrollTargetId="itinerary-content"
      />

      <div id="itinerary-content" className="relative z-20 border-t border-border/50 bg-background">
        <ResultView initial={itinerary} onBack={() => router.push(homeHref)} />
      </div>
    </div>
  )
}
