"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { Itinerary, Stop } from "@/lib/types"
import { withLiveDistances } from "@/lib/geo"
import { totalDistanceKm } from "@/lib/costs"
import { copyText } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FavoriteTripButton } from "@/components/auth/favorite-trip-button"
import { SaveCopyButton } from "@/components/auth/save-copy-button"
import { useAuth } from "@/components/auth/auth-provider"
import { Timeline } from "./timeline"
import { CostSummary } from "./cost-summary"
import { NavLauncher } from "./nav-launcher"
import { TripHero } from "./trip-hero"
import type { MapStop, OriginPoint } from "./itinerary-map"
import { ArrowLeft, Check, Copy, List, Loader2, Map as MapIcon, RotateCcw, Share2, Undo2 } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

const ItineraryMap = dynamic(() => import("./itinerary-map").then((m) => m.ItineraryMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
})

export function ResultView({
  initial,
  onBack,
  onRestart,
  savedId,
  initialIsFavorite = false,
  shareUrl,
  showHero = true,
  showFavoriteButton = true,
  showSaveCopyButton = false,
  onSaveCopy,
  showEditsNotSavedNotice = false,
}: {
  initial: Itinerary
  onBack: () => void
  onRestart?: () => void
  /** Row id of this trip. Always set for generated trips (auto-saved at
   *  generation time); undefined for non-persisted previews (examples). */
  savedId?: string | null
  initialIsFavorite?: boolean
  shareUrl?: string
  showHero?: boolean
  showFavoriteButton?: boolean
  /** Foreign-owned row: offer "save an owned copy" instead of the toggle. */
  showSaveCopyButton?: boolean
  /** Fired with the new row id once the copy exists. */
  onSaveCopy?: (id: string) => void
  /** Foreign-owned row: warn that local edits can't be persisted. */
  showEditsNotSavedNotice?: boolean
}) {
  const { t, locale } = useI18n()
  const { user, configured } = useAuth()
  const [itinerary, setItinerary] = useState<Itinerary>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<"timeline" | "map">("timeline")
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  /** Latest replacement: powers the undo toast (transient) and the pinned previous stop (persistent). */
  const [lastReplaced, setLastReplaced] = useState<{ dayId: string; stopId: string; prev: Stop } | null>(null)
  /** Previous stop per live stop id — survives StopCard remounts (keyed by stop.id). */
  const [prevByStopId, setPrevByStopId] = useState<Record<string, Stop>>({})

  useEffect(() => {
    if (!lastReplaced) return
    const timer = window.setTimeout(() => setLastReplaced(null), 8000)
    return () => window.clearTimeout(timer)
  }, [lastReplaced])

  // Auto-save: trips are persisted at generation time, so reorder / remove /
  // replace edits are PUT back over the same row (debounced). Guest orphans
  // and signed-out viewers get 401/404 and stay quiet — the next edit, the
  // post-login flush, or the post-claim flush retries.
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [autosaveError, setAutosaveError] = useState<string | null>(null)
  const [claimTick, setClaimTick] = useState(0)
  const baselineRef = useRef<string>(JSON.stringify(initial))
  /** Local edits diverging from the last persisted snapshot. */
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)

  useEffect(() => {
    if (!savedId || !configured) return
    const current = JSON.stringify(itinerary)
    if (current === baselineRef.current) return
    setHasUnsavedEdits(true)
    setAutosave("saving")
    setAutosaveError(null)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/trips/${encodeURIComponent(savedId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itinerary }),
          })
          if (!res.ok) {
            if (res.status === 401 || res.status === 404) {
              setAutosave("idle")
              return
            }
            const data = (await res.json().catch(() => null)) as { error?: string } | null
            throw new Error(data?.error === "setup_required" ? t("tripsSetupRequired") : t("tripAutosaveFail"))
          }
          baselineRef.current = current
          setHasUnsavedEdits(false)
          setAutosave("saved")
          window.setTimeout(() => setAutosave((s) => (s === "saved" ? "idle" : s)), 2500)
        } catch (err) {
          setAutosave("error")
          setAutosaveError(err instanceof Error ? err.message : t("tripAutosaveFail"))
        }
      })()
    }, 800)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary, savedId, configured, user?.id, claimTick])

  const shareCurrentPage = async () => {
    setShareError(null)
    const url = shareUrl ? new URL(shareUrl, window.location.origin).href : window.location.href
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: itinerary.title, url })
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return
        }
      }
      await copyText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareError(t("shareFail"))
    }
  }

  const liveItinerary = useMemo<Itinerary>(
    () => ({
      ...itinerary,
      days: withLiveDistances(itinerary.days, itinerary.originLat && itinerary.originLng ? { lat: itinerary.originLat, lng: itinerary.originLng } : undefined),
    }),
    [itinerary],
  )

  const { mapStops, seqMap } = useMemo(() => {
    const map = new Map<string, number>()
    const stops: MapStop[] = []
    let seq = 1
    for (const day of liveItinerary.days) {
      for (const stop of day.stops) {
        // Drive legs are hidden from the timeline (Gemini emits them only
        // for some legs), so they get no display number either — list, map
        // pins, and the hero count share one continuous numbering over
        // visitable stops only.
        if (stop.kind === "drive") continue
        map.set(stop.id, seq)
        stops.push({ ...stop, seq, dayNumber: day.dayNumber })
        seq++
      }
    }
    return { mapStops: stops, seqMap: map }
  }, [liveItinerary])

  const selectedStop = mapStops.find((s) => s.id === selectedId && s.lat != null && s.lng != null) ?? null
  const totalStops = mapStops.length
  const totalKm = totalDistanceKm(liveItinerary)

  const originPoint = useMemo<OriginPoint | undefined>(() => {
    if (liveItinerary.originLat && liveItinerary.originLng) {
      return { lat: liveItinerary.originLat, lng: liveItinerary.originLng, name: liveItinerary.origin }
    }
    return undefined
  }, [liveItinerary])

  const reorder = (dayId: string, fromId: string, toId: string) => {
    setItinerary((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.id !== dayId) return d
        const stops = [...d.stops]
        const from = stops.findIndex((s) => s.id === fromId)
        const to = stops.findIndex((s) => s.id === toId)
        if (from === -1 || to === -1) return d
        const [moved] = stops.splice(from, 1)
        stops.splice(to, 0, moved)
        return { ...d, stops }
      }),
    }))
  }

  const removeStop = (dayId: string, stopId: string) => {
    if (selectedId === stopId) setSelectedId(null)
    if (lastReplaced?.stopId === stopId) setLastReplaced(null)
    setPrevByStopId((prev) => {
      if (!(stopId in prev)) return prev
      const next = { ...prev }
      delete next[stopId]
      return next
    })
    setItinerary((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId ? { ...d, stops: d.stops.filter((s) => s.id !== stopId) } : d,
      ),
    }))
  }

  const replaceStop = (dayId: string, stopId: string, next: Stop) => {
    const prev = itinerary.days.find((d) => d.id === dayId)?.stops.find((s) => s.id === stopId)
    if (prev) {
      setLastReplaced({ dayId, stopId: next.id, prev })
      setPrevByStopId((map) => ({ ...map, [next.id]: prev }))
    }
    setItinerary((prevIt) => ({
      ...prevIt,
      days: prevIt.days.map((d) =>
        d.id === dayId
          ? { ...d, stops: d.stops.map((s) => (s.id === stopId ? next : s)) }
          : d,
      ),
    }))
  }

  const undoReplace = () => {
    if (!lastReplaced) return
    const { dayId, stopId, prev } = lastReplaced
    setLastReplaced(null)
    // The undone stop becomes the "previous" of the restored one, so the
    // alternatives panel lets the user flip back and forth.
    setPrevByStopId((map) => {
      const restored = itinerary.days.find((d) => d.id === dayId)?.stops.find((s) => s.id === stopId)
      const next = { ...map }
      delete next[stopId]
      if (restored) next[prev.id] = restored
      return next
    })
    setItinerary((prevIt) => ({
      ...prevIt,
      days: prevIt.days.map((d) =>
        d.id === dayId
          ? { ...d, stops: d.stops.map((s) => (s.id === stopId ? prev : s)) }
          : d,
      ),
    }))
  }

  const leftColumn = (
    <div className="flex flex-col gap-6">
      {liveItinerary.mode === "road" ? <CostSummary itinerary={liveItinerary} /> : null}
      <Timeline
        days={liveItinerary.days}
        mode={liveItinerary.mode}
        selectedId={selectedId}
        seqOf={(id) => seqMap.get(id) ?? 0}
        onSelect={setSelectedId}
        onReorder={reorder}
        onRemove={removeStop}
        onReplace={replaceStop}
        prevByStopId={prevByStopId}
        vehicle={liveItinerary.vehicle}
      />
    </div>
  )

  const mapColumn = (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative min-h-0 flex-1">
        <ItineraryMap stops={mapStops} selectedId={selectedId} onSelect={setSelectedId} mode={liveItinerary.mode} origin={originPoint} />
      </div>
      <NavLauncher stop={selectedStop} />
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {showHero ? (
        <TripHero
          title={liveItinerary.title}
          subtitle={liveItinerary.subtitle}
          days={liveItinerary.days}
          totalDistanceKm={totalKm}
          totalStops={totalStops}
          onShare={() => void shareCurrentPage()}
          shareLabel={copied ? t("linkCopied") : t("share")}
          shareError={shareError}
          mode={liveItinerary.mode}
          loop={liveItinerary.loop}
          stops={mapStops}
          origin={originPoint}
        />
      ) : null}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-lg" onClick={onBack} aria-label={t("backToConfig")}>
            <ArrowLeft className="size-4" />
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onRestart ? (
            <Button variant="outline" size="lg" className="shrink-0" onClick={onRestart} aria-label={t("restart")}>
              <RotateCcw className="size-4" />
              {t("restart")}
            </Button>
          ) : null}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              {showFavoriteButton ? (
                <FavoriteTripButton
                  tripId={savedId}
                  initialIsFavorite={initialIsFavorite}
                  onClaimed={() => setClaimTick((n) => n + 1)}
                />
              ) : null}
              {showSaveCopyButton && onSaveCopy ? (
                <SaveCopyButton itinerary={liveItinerary} onSaved={onSaveCopy} />
              ) : null}
              {!showHero ? (
                <Button variant="secondary" size="lg" className="shrink-0" onClick={() => void shareCurrentPage()}>
                  <Share2 className="size-4" />
                  {copied ? t("linkCopied") : t("share")}
                </Button>
              ) : null}
            </div>
            {autosave === "saving" ? (
              <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {t("tripAutosaving")}
              </p>
            ) : null}
            {autosave === "saved" ? (
              <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3.5 text-brand" /> {t("tripAutosaved")}
              </p>
            ) : null}
            {autosave === "error" && autosaveError ? (
              <p role="alert" className="text-xs text-destructive">{autosaveError}</p>
            ) : null}
            {showEditsNotSavedNotice && hasUnsavedEdits ? (
              <p role="note" className="max-w-64 text-right text-xs text-muted-foreground">{t("tripEditsNotSaved")}</p>
            ) : null}
            {!showHero && shareError ? <p role="alert" className="text-xs text-destructive">{shareError}</p> : null}
          </div>
        </div>
      </div>

      {/* Mobile tab switch */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 lg:hidden">
        <TabButton active={mobileTab === "timeline"} onClick={() => setMobileTab("timeline")} icon={<List className="size-4" />} label={t("tabItinerary")} />
        <TabButton active={mobileTab === "map"} onClick={() => setMobileTab("map")} icon={<MapIcon className="size-4" />} label={t("tabMap")} />
      </div>

      <div id="itinerary-detail-view">
        {/* Desktop split screen */}
        <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0">{leftColumn}</div>
          <div className="sticky top-20 h-[calc(100vh-6.5rem)]">{mapColumn}</div>
        </div>

        {/* Mobile stacked sheets */}
        <div className="lg:hidden">
          {mobileTab === "timeline" ? (
            leftColumn
          ) : (
            <div className="h-[calc(100vh-13rem)]">{mapColumn}</div>
          )}
        </div>
      </div>

      {/* Undo toast after a stop replacement */}
      {lastReplaced ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card py-2 pl-4 pr-2 shadow-lg"
        >
          <span className="max-w-64 truncate text-sm font-medium text-foreground">
            {t("stopReplaced", { name: lastReplaced.prev.name })}
          </span>
          <Button type="button" size="sm" onClick={undoReplace} className="shrink-0 rounded-full">
            <Undo2 className="size-3.5" />
            {t("undo")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground"
          : "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground"
      }
    >
      {icon}
      {label}
    </button>
  )
}
