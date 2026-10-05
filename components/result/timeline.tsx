"use client"

import { useEffect, useRef, useState } from "react"
import { Fragment } from "react"
import type { ItineraryDay, Stop, TripMode } from "@/lib/types"
import { formatDurationMinutes, formatEur, formatKm } from "@/lib/costs"
import { haversineKm } from "@/lib/geo"
import { StopCard } from "./stop-card"
import { Bus, CalendarDays, Car, Footprints } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

/**
 * Content-aware driving detection: a day involves driving when Gemini
 * budgeted driving time, scheduled an explicit drive leg, or the route
 * actually covers distance — not merely when km >= 15. A 6 km transfer with
 * 25 min of driving is still a driving day; a day with no driving planned
 * is pure exploration even at 12 km on foot.
 */
function dayHasDriving(day: ItineraryDay): boolean {
  return (day.drivingTimeMinutes ?? 0) > 0 || day.distanceKm >= 15 || day.stops.some((stop) => stop.kind === "drive")
}

export function Timeline({
  days,
  vehicle,
  mode,
  selectedId,
  seqOf,
  onSelect,
  onReorder,
  onRemove,
  onReplace,
  prevByStopId,
}: {
  days: ItineraryDay[]
  vehicle?: { consumption: number; fuelPrice: number }
  mode: TripMode
  selectedId: string | null
  seqOf: (stopId: string) => number
  onSelect: (id: string) => void
  onReorder: (dayId: string, fromId: string, toId: string) => void
  onRemove: (dayId: string, stopId: string) => void
  onReplace: (dayId: string, stopId: string, next: Stop) => void
  /** Previous stop per live stop id, for the revertible alternatives panel. */
  prevByStopId?: Record<string, Stop>
}) {
  const dragId = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const { t, locale } = useI18n()

  useEffect(() => {
    if (!selectedId) return
    document.getElementById(`stop-card-${selectedId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  }, [selectedId])

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section key={day.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-brand-muted text-sm font-bold text-brand">
              {day.dayNumber}
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {t("dayLabel", { n: day.dayNumber })}
              </div>
              <h3 className="font-display text-base font-bold text-foreground">{day.title}</h3>
            </div>
          </div>

          {mode === "road" && day.distanceKm > 0 && vehicle ? (
            <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-muted/35 px-3 py-2.5 text-xs text-foreground shadow-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                {!dayHasDriving(day) ? <Footprints className="size-4" /> : <Car className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="font-semibold text-foreground">{formatKm(day.distanceKm, locale)}</span>
                  {!dayHasDriving(day) ? (
                    <span className="text-muted-foreground">
                      {t("stopsCount", { n: day.stops.filter((stop) => stop.kind !== "drive").length })}
                    </span>
                  ) : null}
                  {day.drivingTimeMinutes ? (
                    <span className="text-muted-foreground">{formatDurationMinutes(day.drivingTimeMinutes)}</span>
                  ) : null}
                  {dayHasDriving(day) ? (
                    <span className="text-muted-foreground">
                      {t("transitFuel")}: {formatEur((day.distanceKm / 100) * vehicle.consumption * vehicle.fuelPrice, locale)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <ul className="flex flex-col gap-3">
            {/* Drive legs are hidden: Gemini emits them inconsistently (only
                some legs get one), so the per-day totals strip above is the
                single driving summary. Data is kept — only display filters. */}
            {day.stops.filter((stop) => stop.kind !== "drive").map((stop, stopIndex, visible) => {
              const previous = visible[stopIndex - 1]
              const walkingMinutes = previous
                ? Math.max(2, Math.round((haversineKm(previous, stop) / 4.8) * 60))
                : 0
              return (
                <Fragment key={stop.id}>
                  {mode === "city" && previous ? (
                    <li className="flex items-center gap-3 px-3 py-1 text-xs text-muted-foreground" aria-label={t("cityTransferLabel")}>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand-muted/45 text-brand">
                        {walkingMinutes > 12 ? <Bus className="size-3.5" /> : <Footprints className="size-3.5" />}
                      </span>
                      <span className="h-px flex-1 bg-brand/20" />
                      <span className="font-medium">
                        {walkingMinutes > 12 ? t("cityTransit") : t("cityWalk")} · {formatDurationMinutes(walkingMinutes)}
                      </span>
                      <span className="h-px flex-1 bg-brand/20" />
                    </li>
                  ) : null}
                  <StopCard
                    stop={stop}
                    seq={seqOf(stop.id)}
                    selected={selectedId === stop.id}
                    showParking={mode === "road"}
                    onSelect={() => onSelect(stop.id)}
                    onRemove={() => onRemove(day.id, stop.id)}
                    onReplace={(next) => onReplace(day.id, stop.id, next)}
                    previousStop={prevByStopId?.[stop.id] ?? null}
                    dragging={draggingId === stop.id}
                    onDragStart={() => {
                      dragId.current = stop.id
                      setDraggingId(stop.id)
                    }}
                    onDragEnter={() => {
                      if (dragId.current && dragId.current !== stop.id) {
                        onReorder(day.id, dragId.current, stop.id)
                      }
                    }}
                    onDragEnd={() => {
                      dragId.current = null
                      setDraggingId(null)
                    }}
                    onDrop={() => {
                      dragId.current = null
                      setDraggingId(null)
                    }}
                  />
                </Fragment>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
