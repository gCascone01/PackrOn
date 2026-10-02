"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { ResultView } from "@/components/result/result-view"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { useI18n } from "@/components/locale-provider"
import { localizedPath } from "@/lib/paths"
import type { Itinerary } from "@/lib/types"
import { isItinerary, type SavedTrip } from "@/lib/trips"
import { Button } from "@/components/ui/button"
import { useGuestTrips } from "@/hooks/use-guest-trips"

export function SavedTripView({ tripId, publicView = false }: { tripId: string; publicView?: boolean }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { user, loading: authLoading, configured } = useAuth()
  const { addTrip, removeTrip } = useGuestTrips()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [tripOwnerId, setTripOwnerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [claimIntent, setClaimIntent] = useState(false)
  const claimAttempted = useRef(false)

  const homeHref = localizedPath(locale, "/")
  const tripsHref = localizedPath(locale, "/trips")

  useEffect(() => {
    if (authLoading) return
    if (!configured || (!publicView && !user)) return
    setItinerary(null)
    setTripOwnerId(null)
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
        if (!cancelled) {
          setItinerary(data.trip.data)
          setTripOwnerId(data.trip.user_id)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("tripsLoadFail"))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, configured, publicView, user, tripId])

  useEffect(() => {
    if (publicView && !authLoading && !user && itinerary && tripOwnerId === null) {
      addTrip({
        id: tripId,
        title: itinerary.title,
        destination: itinerary.mode === "city" ? itinerary.origin : "",
      })
    }
  }, [addTrip, authLoading, itinerary, publicView, tripId, tripOwnerId, user])

  useEffect(() => {
    if (!publicView || authLoading || !user || !itinerary || tripOwnerId !== null || !claimIntent || claimAttempted.current) {
      return
    }
    claimAttempted.current = true
    const claim = async () => {
      try {
        const response = await fetch("/api/trips/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId }),
        })
        if (!response.ok) throw new Error("Trip claim failed")
        setTripOwnerId(user.id)
        removeTrip(tripId)
        setClaimIntent(false)
      } catch {
        claimAttempted.current = false
        console.error("[trips] claim request failed")
      }
    }
    void claim()
  }, [authLoading, claimIntent, itinerary, publicView, removeTrip, tripId, tripOwnerId, user])

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

  if (!user && !publicView) {
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
      {publicView ? (
        <AuthDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initialMode="signup"
          returnTo={localizedPath(locale, `/trip/${encodeURIComponent(tripId)}`)}
          onSignupSuccess={() => setClaimIntent(true)}
        />
      ) : null}
      <ResultView
        key={tripId}
        initial={itinerary}
        onBack={() => router.push(publicView ? homeHref : tripsHref)}
        savedId={tripId}
        shareUrl={localizedPath(locale, `/trip/${encodeURIComponent(tripId)}`)}
        showSaveButton={!publicView || Boolean(user)}
        allowDelete={!publicView}
      />
      {publicView && !user && tripOwnerId === null ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex w-max max-w-[calc(100vw_-_2rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-border bg-background/90 px-4 py-3 shadow-2xl backdrop-blur-md sm:bottom-8 sm:gap-4 sm:px-6">
          <p className="min-w-0 text-xs font-medium text-foreground sm:text-sm">{t("guestTripBanner")}</p>
          <Button size="sm" className="shrink-0" onClick={() => setDialogOpen(true)}>{t("authSignup")}</Button>
        </div>
      ) : null}
    </div>
  )
}
