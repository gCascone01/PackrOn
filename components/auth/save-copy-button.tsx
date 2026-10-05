"use client"

import { useState } from "react"
import { Loader2, Star } from "lucide-react"
import { useAuth } from "./auth-provider"
import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import type { Itinerary } from "@/lib/types"

/**
 * "Save to favourites" for a trip owned by someone else.
 *
 * PATCHing a foreign row is owner-only (RLS → 404), so favouriting it
 * means creating an owned copy: POST /api/trips with `is_favorite: true`.
 * The caller navigates to the copy (usually the private trip view).
 */
export function SaveCopyButton({
  itinerary,
  onSaved,
}: {
  /** The trip as currently displayed (edits included). */
  itinerary: Itinerary
  /** Fired with the new row id once the copy exists. */
  onSaved: (id: string) => void
}) {
  const { t } = useI18n()
  const { user, configured } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const save = async () => {
    if (pending) return
    if (!configured) {
      setError(t("authNotConfigured"))
      return
    }
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary, is_favorite: true }),
      })
      const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null
      if (!res.ok || !data?.id) {
        throw new Error(data?.error === "setup_required" ? t("tripsSetupRequired") : t("tripSaveFail"))
      }
      onSaved(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tripSaveFail"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <Button variant="outline" size="lg" onClick={() => void save()} disabled={pending} title={t("tripSaveCopy")}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
        {pending ? t("tripSaving") : t("tripSaveCopy")}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
