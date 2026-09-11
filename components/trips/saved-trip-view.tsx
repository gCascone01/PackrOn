"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { ResultView } from "@/components/result/result-view"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { useI18n } from "@/components/locale-provider"
import { localizedPath } from "@/lib/paths"
import { isItinerary } from "@/lib/share"
import type { Itinerary } from "@/lib/types"
import type { SavedTrip } from "@/lib/trips"
import { Button } from "@/components/ui/button"

export function SavedTripView({ tripId }: { tripId: string }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { user, loading: authLoading, configured } = useAuth()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const homeHref = localizedPath(locale, "/")
  const tripsHref = localizedPath(locale, "/trips")

  useEffect(() => {
    if (authLoading) return
    if (!configured || !user) return
    setItinerary(null)
    setError(null)
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}`)
        const data = (await res.json()) as { trip?: SavedTrip; error?: string }
        if (!res.ok || !data.trip || !isItinerary(data.trip.data)) {
          if (data.error === "setup_required") throw new Error(t("tripsSetupRequired"))
          throw new Error(res.status === 404 ? t("sharedInvalid") : t("tripsLoadFail"))
        }
        if (!cancelled) setItinerary(data.trip.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("tripsLoadFail"))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, configured, user, tripId])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("authWorking")}
        </main>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t("authNotConfigured")}
          </p>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("tripsSignInPrompt")}</p>
          <Button size="lg" className="mt-4" onClick={() => setDialogOpen(true)}>
            {t("authLogin")}
          </Button>
          <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
        </main>
      </div>
    )
  }

  if (error || (itinerary === null && error !== null)) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <p role="alert" className="text-base text-muted-foreground">{error ?? t("sharedInvalid")}</p>
          <Button size="lg" className="mt-6" onClick={() => router.push(tripsHref)}>
            {t("authMyTrips")}
          </Button>
        </main>
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("sharedLoading")}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader onBrandClick={() => router.push(homeHref)} />
      <ResultView
        key={tripId}
        initial={itinerary}
        onBack={() => router.push(tripsHref)}
        savedId={tripId}
        onDeleted={() => router.push(tripsHref)}
      />
    </div>
  )
}
