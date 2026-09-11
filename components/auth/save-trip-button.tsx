"use client"

import { useMemo, useState } from "react"
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react"
import type { Itinerary } from "@/lib/types"
import { useAuth } from "./auth-provider"
import { AuthDialog } from "./auth-dialog"
import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"

/**
 * Save-to-account button with three states:
 * - never saved (no `savedId`) → "Save trip", click POSTs a new record.
 * - saved and unedited (snapshot matches) → checked "Saved",
 *   click asks for confirmation and DELETEs the record.
 * - saved but edited (snapshot differs) → unchecked "Save trip",
 *   click PUTs over the same record (no duplicates); if that record is
 *   gone (404), falls back to POSTing a new one.
 *
 * The snapshot is taken on mount: when a saved trip is opened, the shown
 * itinerary IS the saved one, so any reorder/remove/replace (which produces
 * a new `itinerary` object upstream) flips the button to unchecked.
 */
export function SaveTripButton({
  itinerary,
  savedId: initialSavedId,
  onDeleted,
}: {
  itinerary: Itinerary
  savedId?: string | null
  onDeleted?: () => void
}) {
  const { t } = useI18n()
  const { user, configured } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(initialSavedId ?? null)
  const [snapshot, setSnapshot] = useState<string | null>(() =>
    initialSavedId ? JSON.stringify(itinerary) : null,
  )
  const [error, setError] = useState<string | null>(null)

  const current = useMemo(() => JSON.stringify(itinerary), [itinerary])
  const dirty = snapshot !== null && snapshot !== current
  const checked = savedId !== null && !dirty

  const postNew = async (): Promise<string | null> => {
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itinerary }),
    })
    const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null
    if (!res.ok || !data?.id) {
      throw new Error(
        data?.error === "setup_required"
          ? t("tripsSetupRequired")
          : res.status === 401
            ? t("authLoginRequired")
            : t("tripSaveFail"),
      )
    }
    return data.id
  }

  const putExisting = async (id: string): Promise<"ok" | "missing"> => {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itinerary }),
    })
    const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null
    if (res.ok) return "ok"
    if (res.status === 404) return "missing"
    throw new Error(
      data?.error === "setup_required"
        ? t("tripsSetupRequired")
        : res.status === 401
          ? t("authLoginRequired")
          : t("tripSaveFail"),
    )
  }

  const save = async () => {
    if (!configured) {
      setError(t("authNotConfigured"))
      return
    }
    if (!user) {
      setDialogOpen(true)
      return
    }
    setPending(true)
    setError(null)
    try {
      let id = savedId
      if (id) {
        const outcome = await putExisting(id)
        if (outcome === "missing") id = await postNew()
      } else {
        id = await postNew()
      }
      setSavedId(id)
      setSnapshot(current)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tripSaveFail"))
    } finally {
      setPending(false)
    }
  }

  const remove = async () => {
    if (!savedId || !window.confirm(t("tripsDeleteConfirm"))) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(savedId)}`, { method: "DELETE" })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        throw new Error(data?.error === "setup_required" ? t("tripsSetupRequired") : t("tripsDeleteFail"))
      }
      setSavedId(null)
      setSnapshot(null)
      onDeleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tripsDeleteFail"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <Button
        variant={checked ? "default" : "outline"}
        size="lg"
        onClick={checked ? remove : save}
        disabled={pending}
        title={checked ? t("tripSaved") : t("tripSave")}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : checked ? (
          <BookmarkCheck className="size-4" />
        ) : (
          <Bookmark className="size-4" />
        )}
        {pending ? t("tripSaving") : checked ? t("tripSaved") : t("tripSave")}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
