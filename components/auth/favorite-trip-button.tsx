"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Star } from "lucide-react"
import { useAuth } from "./auth-provider"
import { AuthDialog } from "./auth-dialog"
import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Favourite toggle for an already-persisted trip row.
 *
 * Every generated trip is auto-saved at generation time
 * (`POST /api/generate-trip` inserts the row), so this button never
 * creates records — it only flips `is_favorite` via
 * `PATCH /api/trips/[id]`.
 *
 * Guest flow: a logged-out visitor viewing an orphan (null-owner) trip is
 * asked to sign in; once a session exists the row is claimed
 * (`POST /api/trips/claim`) and then favourited. A logged-in viewer of an
 * orphan row claims transparently on first toggle (PATCH 404 → claim →
 * retry).
 */
export function FavoriteTripButton({
  tripId,
  initialIsFavorite = false,
  onClaimed,
}: {
  /** Row id, or null/undefined for non-persisted views (e.g. examples). */
  tripId?: string | null
  initialIsFavorite?: boolean
  /** Fired when this button claims an orphan row for the current user. */
  onClaimed?: () => void
}) {
  const { t } = useI18n()
  const { user, configured } = useAuth()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  /** Set when the user tapped the button while logged out. */
  const pendingAfterAuth = useRef(false)

  useEffect(() => {
    setIsFavorite(initialIsFavorite)
  }, [initialIsFavorite, tripId])

  const claim = async (id: string): Promise<void> => {
    const res = await fetch("/api/trips/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: id }),
    })
    if (res.ok) {
      onClaimed?.()
      return
    }
    // Already owned by this user (or a sibling tab claimed it): not fatal.
    if (res.status === 404) return
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(
      data?.error === "setup_required" ? t("tripsSetupRequired") : t("tripFavoriteFail"),
    )
  }

  const patchFavorite = async (id: string, value: boolean): Promise<void> => {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: value }),
    })
    if (res.ok) return
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    if (data?.error === "setup_required") throw new Error(t("tripsSetupRequired"))
    if (res.status === 401) throw new Error(t("tripFavoriteLogin"))
    if (res.status === 404) throw new Error("NOT_FOUND")
    throw new Error(t("tripFavoriteFail"))
  }

  const setFavorite = async (id: string, value: boolean) => {
    try {
      await patchFavorite(id, value)
    } catch (err) {
      // Orphan row: claim it for this user, then retry once. A row owned
      // by someone else stays 404 — surface the friendly message, never
      // the raw NOT_FOUND sentinel.
      if (err instanceof Error && err.message === "NOT_FOUND") {
        await claim(id)
        try {
          await patchFavorite(id, value)
        } catch {
          throw new Error(t("tripFavoriteFail"))
        }
        return
      }
      throw err
    }
  }

  const toggle = async () => {
    if (!configured) {
      setError(t("authNotConfigured"))
      return
    }
    if (!tripId || pending) return
    if (!user) {
      pendingAfterAuth.current = true
      setDialogOpen(true)
      return
    }
    setPending(true)
    setError(null)
    const next = !isFavorite
    try {
      await setFavorite(tripId, next)
      setIsFavorite(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tripFavoriteFail"))
    } finally {
      setPending(false)
    }
  }

  // The tap happened while logged out: the dialog just produced a session.
  useEffect(() => {
    if (!pendingAfterAuth.current || !user || !tripId) return
    pendingAfterAuth.current = false
    setPending(true)
    setError(null)
    setFavorite(tripId, true)
      .then(() => setIsFavorite(true))
      .catch((err) => setError(err instanceof Error ? err.message : t("tripFavoriteFail")))
      .finally(() => setPending(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tripId])

  if (!tripId) return null

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <Button
        variant={isFavorite ? "default" : "outline"}
        size="lg"
        onClick={() => void toggle()}
        disabled={pending}
        title={isFavorite ? t("tripFavorited") : t("tripFavorite")}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Star className={cn("size-4", isFavorite && "fill-current")} />
        )}
        {isFavorite ? t("tripFavorited") : t("tripFavorite")}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initialMode="signup" />
    </div>
  )
}
