"use client"

import { useEffect, useRef, useState } from "react"
import { Fragment } from "react"
import type { ItineraryDay, Stop, TripMode } from "@/lib/types"
import { formatDurationMinutes, formatEur, formatKm } from "@/lib/costs"
import { haversineKm } from "@/lib/geo"
import { StopCard } from "./stop-card"
import { Bus, CalendarDays, Car, Clock, Footprints } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

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
          <div className="flex items-center justify-between gap-3">
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
            {mode === "road" ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {day.drivingTimeMinutes ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3.5 text-brand" />
                    {formatDurationMinutes(day.drivingTimeMinutes)} {t("driving")}
                  </span>
                ) : null}
                {day.distanceKm > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {day.distanceKm < 15 ? <Footprints className="size-3.5 text-brand" /> : <Car className="size-3.5 text-brand" />}
                    {formatKm(day.distanceKm, locale)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {mode === "road" && day.distanceKm > 0 && vehicle ? (
            <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-muted/35 px-3 py-2.5 text-xs text-foreground shadow-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                {day.distanceKm < 15 ? <Footprints className="size-4" /> : <Car className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {t("transitTo", { destination: day.title })}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                  <span>{formatKm(day.distanceKm, locale)}</span>
                  {day.drivingTimeMinutes ? <span>{formatDurationMinutes(day.drivingTimeMinutes)}</span> : null}
                  <span>
                    {t("transitFuel")}: {formatEur((day.distanceKm / 100) * vehicle.consumption * vehicle.fuelPrice, locale)}
                  </span>
                </div>
              </div>
              <span className="hidden shrink-0 items-center rounded-full border border-brand/20 bg-card px-2 py-1 font-medium text-brand sm:inline-flex">
                {t("transitTolls")}
              </span>
            </div>
          ) : null}

          <ul className="flex flex-col gap-3">
            {day.stops.map((stop, stopIndex) => {
              const previous = day.stops[stopIndex - 1]
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
