"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { Itinerary, Stop } from "@/lib/types"
import { withLiveDistances } from "@/lib/geo"
import { formatKm, totalDistanceKm } from "@/lib/costs"
import { buildShareUrl, copyText, encodeItinerary } from "@/lib/share"
import { localizedPath } from "@/lib/paths"
import { Button } from "@/components/ui/button"
import { SaveTripButton } from "@/components/auth/save-trip-button"
import { Timeline } from "./timeline"
import { CostSummary } from "./cost-summary"
import { NavLauncher } from "./nav-launcher"
import type { MapStop, OriginPoint } from "./itinerary-map"
import { ArrowLeft, CalendarDays, Check, Copy, List, Map as MapIcon, RotateCcw, Share2 } from "lucide-react"
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
}: {
  initial: Itinerary
  onBack: () => void
  onRestart?: () => void
  /** Server id when this view shows a trip loaded from the account. */
  savedId?: string | null
}) {
  const { t, locale } = useI18n()
  const [itinerary, setItinerary] = useState<Itinerary>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<"timeline" | "map">("timeline")
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const prepare = async () => {
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itinerary),
        })
        if (res.ok) {
          const data = (await res.json()) as { id?: string }
          if (!cancelled && data.id) {
            setShareUrl(`${window.location.origin}${localizedPath(locale, `/i/${data.id}`)}`)
            return
          }
        }
      } catch {
        // Fall back to embedding the itinerary in the URL.
      }
      try {
        const token = await encodeItinerary(itinerary)
        if (!cancelled) setShareUrl(buildShareUrl(window.location.origin, token, locale))
      } catch {
        if (!cancelled) setShareUrl(null)
      }
    }
    void prepare()
    return () => {
      cancelled = true
    }
  }, [itinerary, locale])

  useEffect(() => {
    if (!shareOpen) return
    const onPointer = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShareOpen(false)
      }
    }
    window.addEventListener("mousedown", onPointer)
    return () => window.removeEventListener("mousedown", onPointer)
  }, [shareOpen])

  const copyShareLink = async () => {
    setShareError(null)
    if (!shareUrl) {
      setShareError(t("shareFail"))
      return
    }
    try {
      await copyText(shareUrl)
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
        map.set(stop.id, seq)
        stops.push({ ...stop, seq, dayNumber: day.dayNumber })
        seq++
      }
    }
    return { mapStops: stops, seqMap: map }
  }, [liveItinerary])

  const selectedStop = mapStops.find((s) => s.id === selectedId) ?? null
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
    setItinerary((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId ? { ...d, stops: d.stops.filter((s) => s.id !== stopId) } : d,
      ),
    }))
  }

  const replaceStop = (dayId: string, stopId: string, next: Stop) => {
    setItinerary((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId
          ? { ...d, stops: d.stops.map((s) => (s.id === stopId ? next : s)) }
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
      {/* Trip header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon-lg" onClick={onBack} aria-label={t("backToConfig")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground text-balance">
              {liveItinerary.title}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{liveItinerary.subtitle}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Meta icon={<CalendarDays className="size-3.5" />} text={t("daysCount", { n: liveItinerary.days.length })} />
              <Meta icon={<List className="size-3.5" />} text={t("stopsCount", { n: totalStops })} />
              {liveItinerary.mode === "road" ? (
                <Meta icon={<MapIcon className="size-3.5" />} text={formatKm(totalKm, locale)} />
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onRestart ? (
            <Button variant="outline" size="lg" className="shrink-0" onClick={onRestart} aria-label={t("restart")}>
              <RotateCcw className="size-4" />
              {t("restart")}
            </Button>
          ) : null}
          <div className="relative shrink-0" ref={shareRef}>
          <div className="flex items-center gap-2">
            <SaveTripButton itinerary={itinerary} savedId={savedId} />
            <Button
            variant="secondary"
            size="lg"
            className="shrink-0"
            aria-haspopup="menu"
            aria-expanded={shareOpen}
            onClick={() => {
              setShareOpen((open) => !open)
              setShareError(null)
            }}
          >
            <Share2 className="size-4" />
            {t("share")}
          </Button>
          </div>
          {shareOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-border bg-card p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                disabled={!shareUrl}
                data-share-url={shareUrl ?? undefined}
                onClick={copyShareLink}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted"
              >
                {copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
                {copied ? t("linkCopied") : t("copyLink")}
              </button>
              {shareError ? (
                <p role="alert" className="px-3 pb-2 text-xs text-destructive">
                  {shareError}
                </p>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>
      </div>

      {/* Mobile tab switch */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 lg:hidden">
        <TabButton active={mobileTab === "timeline"} onClick={() => setMobileTab("timeline")} icon={<List className="size-4" />} label={t("tabItinerary")} />
        <TabButton active={mobileTab === "map"} onClick={() => setMobileTab("map")} icon={<MapIcon className="size-4" />} label={t("tabMap")} />
      </div>

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
  )
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-medium text-muted-foreground">
      {icon}
      {text}
    </span>
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
