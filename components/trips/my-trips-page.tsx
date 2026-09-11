"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Car, Footprints, Loader2, MapPin, Plus, Trash2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { useI18n } from "@/components/locale-provider"
import { localizedPath } from "@/lib/paths"
import type { SavedTripSummary } from "@/lib/trips"
import { Button } from "@/components/ui/button"

export function MyTripsPage() {
  const { t, locale } = useI18n()
  const { user, loading: authLoading, configured } = useAuth()
  const router = useRouter()
  const [trips, setTrips] = useState<SavedTripSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!configured || !user) {
      setTrips(null)
      return
    }
    let cancelled = false
    const load = async () => {
      setError(null)
      try {
        const res = await fetch("/api/trips")
        const data = (await res.json()) as { trips?: SavedTripSummary[]; error?: string }
        if (!res.ok || !data.trips) {
          throw new Error(data.error === "setup_required" ? t("tripsSetupRequired") : t("tripsLoadFail"))
        }
        if (!cancelled) setTrips(data.trips)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("tripsLoadFail"))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, configured, user])

  const remove = async (id: string) => {
    if (!window.confirm(t("tripsDeleteConfirm"))) return
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error === "setup_required" ? t("tripsSetupRequired") : t("tripsDeleteFail"))
      }
      setTrips((prev) => (prev ? prev.filter((trip) => trip.id !== id) : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tripsDeleteFail"))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">{t("tripsTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("tripsSubtitle")}</p>

        {authLoading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("authWorking")}
          </div>
        ) : !configured ? (
          <p role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t("authNotConfigured")}
          </p>
        ) : !user ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("tripsSignInPrompt")}</p>
            <Button size="lg" className="mt-4" onClick={() => setDialogOpen(true)}>
              {t("authLogin")}
            </Button>
            <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
          </div>
        ) : error ? (
          <p role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : trips === null ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("authWorking")}
          </div>
        ) : trips.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
            <p className="text-sm text-muted-foreground">{t("tripsEmpty")}</p>
            <Button size="lg" className="mt-4" onClick={() => router.push(localizedPath(locale, "/"))}>
              <Plus className="size-4" /> {t("tripsEmptyAction")}
            </Button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {trips.map((trip) => (
              <li key={trip.id} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold text-foreground">{trip.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {trip.mode === "road" ? <Car className="size-3.5" /> : <Footprints className="size-3.5" />}
                      {t("daysCount", { n: trip.days_count })} · {t("stopsCount", { n: trip.stops_count })}
                    </p>
                    {trip.origin ? (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" /> {trip.origin}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={deletingId === trip.id}
                    onClick={() => remove(trip.id)}
                    aria-label={t("tripsDelete")}
                    title={t("tripsDelete")}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    {deletingId === trip.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
                <Link
                  href={localizedPath(locale, `/trips/${trip.id}`)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80"
                >
                  {t("tripsOpen")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
