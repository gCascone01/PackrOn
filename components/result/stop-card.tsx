"use client"

import { useState } from "react"
import type { DragEvent } from "react"
import type { Stop } from "@/lib/types"
import { CategoryBadge } from "@/components/category-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BedDouble, Clock, FileText, GripVertical, Hourglass, MapPin, ParkingSquare, RefreshCw, Search, Ticket, Trash2, X } from "lucide-react"
import { bookingSearchUrl, getYourGuideSearchUrl, googleMapsSearchUrl } from "@/lib/affiliate-links"
import type { StopImage } from "@/lib/stop-image"
import { useI18n } from "@/components/locale-provider"

function estimatedEndTime(start: string, duration: string): string | null {
  const match = duration.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/)
  if (!match || (!match[1] && !match[2])) return null
  const [hours, minutes] = start.split(":").map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  const total = hours * 60 + minutes + Number(match[1] || 0) * 60 + Number(match[2] || 0)
  const endHours = Math.floor((total % 1440) / 60)
  const endMinutes = total % 60
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`
}

export function StopCard({
  stop,
  seq,
  selected,
  showParking,
  onSelect,
  onRemove,
  onReplace,
  dragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}: {
  stop: Stop
  seq: number
  selected: boolean
  showParking: boolean
  onSelect: () => void
  onRemove: () => void
  onReplace: (next: Stop) => void
  dragging: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnter: (e: DragEvent) => void
  onDragEnd: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
}) {
  const { t, locale } = useI18n()
  const [alts, setAlts] = useState<Stop[] | null>(null)
  const [loadingAlts, setLoadingAlts] = useState(false)
  const [description, setDescription] = useState<string | null>(null)
  const [stopImage, setStopImage] = useState<StopImage | null>(null)
  const [loadingDescription, setLoadingDescription] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const isOvernightStop = stop.category === "notte"
  const endTime = estimatedEndTime(stop.time, stop.duration)
  const experienceQuery = (() => {
    const candidate = (stop.getYourGuideQuery || stop.name || "").trim()
    if (!candidate) return stop.name
    return stop.name.toLowerCase().includes(candidate.toLowerCase()) ? stop.name : candidate
  })()

  const openAlternatives = async () => {
    if (alts) {
      setAlts(null)
      return
    }
    setLoadingAlts(true)
    try {
      const res = await fetch("/api/suggest-stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stop, locale }),
      })
      const data = (await res.json()) as { alternatives?: Stop[]; error?: string }
      if (!res.ok || !data.alternatives?.length) {
        throw new Error(data.error || t("apiAltsFail"))
      }
      setAlts(data.alternatives)
    } catch {
      setAlts(null)
    } finally {
      setLoadingAlts(false)
    }
  }

  const fetchDescription = async () => {
    if (description) {
      setShowDescription(true)
      return
    }
    setLoadingDescription(true)
    try {
      const res = await fetch("/api/describe-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stop, locale }),
      })
      const data = (await res.json()) as { description?: string; image?: StopImage | null; error?: string }
      if (!res.ok || !data.description) {
        throw new Error(data.error || t("descriptionUnavailable"))
      }
      setDescription(data.description)
      setStopImage(data.image ?? null)
      setShowDescription(true)
    } catch {
      setDescription(t("descriptionUnavailable"))
      setShowDescription(true)
    } finally {
      setLoadingDescription(false)
    }
  }

  return (
    <li
      id={`stop-card-${stop.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onSelect}
      className={cn(
        "group relative rounded-2xl border bg-card p-4 transition-all",
        selected ? "border-brand ring-1 ring-brand/25 shadow-md" : "border-border hover:border-ring/40 hover:shadow-sm",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={t("drag")}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/60 transition hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-5" />
        </button>

        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
          {seq}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-sm font-bold text-foreground">
              {isOvernightStop ? stop.bookingQuery || stop.name : stop.name}
            </h4>
            <CategoryBadge category={stop.category} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stop.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-brand" />
              <span aria-label={endTime ? `${stop.time} - ${endTime}` : stop.time}>
                {endTime ? `${stop.time}–${endTime}` : stop.time}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Hourglass className="size-3.5 text-brand" />
              {stop.duration}
            </span>
            {showParking && stop.parking ? (
              <span className="inline-flex items-center gap-1.5">
                <ParkingSquare className="size-3.5 text-brand" />
                {stop.parking}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={googleMapsSearchUrl(stop.name, stop.lat, stop.lng)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand px-2.5 text-xs font-semibold text-brand-foreground transition hover:opacity-90"
            >
              <MapPin className="size-3.5" />
              {t("openInMaps")}
            </a>
            {isOvernightStop ? (
              <>
                <a
                  href={bookingSearchUrl(stop.bookingQuery || stop.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  <BedDouble className="size-3.5" />
                  {t("lodging")}
                </a>
                {stop.bookingCity ? (
                  <a
                    href={bookingSearchUrl(stop.bookingCity)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    <Search className="size-3.5" />
                    {t("otherLodgings")}
                  </a>
                ) : null}
              </>
            ) : null}
            {!isOvernightStop ? (
              <a
                href={getYourGuideSearchUrl(experienceQuery)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <Ticket className="size-3.5" />
                {t("experiences")}
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                fetchDescription()
              }}
            >
              <FileText className={cn("size-3.5", loadingDescription && "animate-spin")} />
              {t("description")}
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                openAlternatives()
              }}
            >
              <RefreshCw className={cn("size-3.5", loadingAlts && "animate-spin")} />
              {t("changeStop")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              <Trash2 className="size-3.5" />
              {t("remove")}
            </Button>
          </div>

          {(loadingAlts || alts) && (
            <div className="mt-3 rounded-xl border border-border bg-muted/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{t("altsTitle")}</span>
                {alts ? (
                  <button
                    type="button"
                    aria-label={t("closeAlts")}
                    onClick={(e) => {
                      e.stopPropagation()
                      setAlts(null)
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              {loadingAlts ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {alts?.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                          <CategoryBadge category={a.category} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReplace({ ...a, time: stop.time, parking: stop.parking })
                          setAlts(null)
                        }}
                      >
                        {t("useAlt")}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showDescription && description && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowDescription(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="description-title"
            >
              <div
                className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 id="description-title" className="font-semibold text-foreground">
                    {t("description")} - {stop.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowDescription(false)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none text-foreground">
                  {stopImage ? (
                    <figure className="mb-4">
                      <img
                        src={stopImage.url}
                        alt={stopImage.title}
                        loading="lazy"
                        className="aspect-video w-full rounded-xl object-cover"
                      />
                      <figcaption className="mt-1.5 text-xs text-muted-foreground">
                        <a
                          href={stopImage.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          {stopImage.title}
                        </a>{" "}
                        · {t("imageViaWikipedia")}
                      </figcaption>
                    </figure>
                  ) : null}
                  <p className="whitespace-pre-wrap">{description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
