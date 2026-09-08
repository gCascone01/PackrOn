"use client"

import { useRef, useState } from "react"
import type { ItineraryDay, Stop, TripMode } from "@/lib/types"
import { formatDurationMinutes, formatKm } from "@/lib/costs"
import { StopCard } from "./stop-card"
import { CalendarDays, Car, Clock } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

export function Timeline({
  days,
  mode,
  selectedId,
  seqOf,
  onSelect,
  onReorder,
  onRemove,
  onReplace,
}: {
  days: ItineraryDay[]
  mode: TripMode
  selectedId: string | null
  seqOf: (stopId: string) => number
  onSelect: (id: string) => void
  onReorder: (dayId: string, fromId: string, toId: string) => void
  onRemove: (dayId: string, stopId: string) => void
  onReplace: (dayId: string, stopId: string, next: Stop) => void
}) {
  const dragId = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const { t, locale } = useI18n()

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
                    <Car className="size-3.5 text-brand" />
                    {formatKm(day.distanceKm, locale)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <ul className="flex flex-col gap-3">
            {day.stops.map((stop) => (
              <StopCard
                key={stop.id}
                stop={stop}
                seq={seqOf(stop.id)}
                selected={selectedId === stop.id}
                showParking={mode === "road"}
                onSelect={() => onSelect(stop.id)}
                onRemove={() => onRemove(day.id, stop.id)}
                onReplace={(next) => onReplace(day.id, stop.id, next)}
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
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
