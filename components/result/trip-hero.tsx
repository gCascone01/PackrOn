"use client"

import dynamic from "next/dynamic"
import { CalendarDays, MapPin, Route, Share2 } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import { formatKm } from "@/lib/costs"
import type { ItineraryDay, TripMode } from "@/lib/types"
import type { MapStop, OriginPoint } from "./itinerary-map"

const ItineraryMap = dynamic(() => import("./itinerary-map").then((m) => m.ItineraryMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
})

export interface TripHeroProps {
  title: string
  subtitle?: string
  days: Array<Pick<ItineraryDay, "dayNumber" | "title">>
  totalDistanceKm: number
  totalStops: number
  onShare: () => void
  shareLabel: string
  shareError?: string | null
  mode: TripMode
  loop: boolean
  stops: MapStop[]
  origin?: OriginPoint
}

export function TripHero({
  title,
  subtitle,
  days,
  totalDistanceKm,
  totalStops,
  onShare,
  shareLabel,
  shareError,
  mode,
  loop,
  stops,
  origin,
}: TripHeroProps) {
  const { t, locale } = useI18n()
  const visibleDays = days.slice(0, 3)

  return (
    <div className="relative mb-6 flex flex-col items-center justify-center overflow-hidden px-3 pt-6 pb-10 sm:px-4 sm:pt-10 md:pt-16 md:pb-16">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vw] max-h-[600px] w-[60vw] max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-[120px]" />
      <div className="relative z-10 grid h-auto min-h-fit w-full max-w-6xl grid-cols-1 items-stretch gap-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-700/70 dark:bg-slate-900 dark:shadow-black/20 md:aspect-[1200/630] md:max-h-[630px] md:min-h-0 md:grid-cols-12 md:gap-0 md:rounded-3xl md:p-0">
        <div className="flex min-w-0 flex-col justify-between gap-y-3 p-4 md:col-span-7 md:min-h-0 md:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-y-3 md:gap-y-2">
            <div className="flex w-full items-center justify-between gap-2">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:border-brand/50 dark:bg-brand/20 dark:text-slate-200">
                {t("curatedByPackron")}
              </div>
              <button
                type="button"
                onClick={onShare}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Share2 className="size-3.5" />
                {shareLabel}
              </button>
            </div>
            {shareError ? <p role="alert" className="text-xs text-destructive">{shareError}</p> : null}
            <h1 className="max-w-2xl text-2xl leading-[1.12] font-extrabold tracking-tight text-slate-900 text-balance sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl dark:text-slate-100">
              {title}
            </h1>

            {subtitle ? <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">{subtitle}</p> : null}

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                <CalendarDays className="size-3.5 text-brand" />
                {t(days.length === 1 ? "dayCount" : "daysCount", { n: days.length })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                <Route className="size-3.5 text-brand" />
                {formatKm(totalDistanceKm, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                <MapPin className="size-3.5 text-brand" />
                {t("stopsCount", { n: totalStops })}
              </span>
            </div>
          </div>

          <div className="min-w-0 pt-1 md:pt-0">
            <p className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("whatToExpect")}
            </p>
            <ul className="space-y-0">
              {visibleDays.map((day, index) => (
                <li key={day.dayNumber} className="flex gap-2.5 py-1 text-sm/relaxed text-slate-700 dark:text-slate-200">
                  <span className="relative flex w-2 shrink-0 self-stretch justify-center">
                    {index < visibleDays.length - 1 ? (
                      <span className="absolute left-1/2 top-[0.6875rem] bottom-[-1.1875rem] z-0 w-0.5 -translate-x-1/2 bg-brand/40" />
                    ) : null}
                    <span className="relative z-10 mt-[0.4375rem] size-2 shrink-0 rounded-full bg-brand" />
                  </span>
                  <span className="min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <strong className="font-semibold">{t("itineraryDayLabel", { n: day.dayNumber })}</strong>
                    {" · "}
                    {day.title.replace(/^\s*(?:DAY|GIORNO)\s+\d+\s*:\s*/i, "")}
                  </span>
                </li>
              ))}
              {days.length > 3 ? (
                <li className="pt-1 text-sm italic text-slate-500 dark:text-slate-400">
                  {t("moreDays", { n: days.length - 3 })}
                </li>
              ) : null}
            </ul>
            <p className="mt-2 text-sm font-semibold text-brand">{t("adventureBegin")}</p>
          </div>
        </div>

        <div className="relative min-h-[220px] w-full overflow-hidden rounded-b-2xl rounded-t-none border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-5 md:h-full md:min-h-0 md:rounded-l-none md:rounded-r-2xl md:border-l-0">
          <div className="pointer-events-auto absolute inset-0">
            <ItineraryMap
              stops={stops}
              selectedId={null}
              onSelect={() => {}}
              mode={mode}
              loop={loop}
              origin={origin}
              zoomControl={false}
              attributionControl
              interactive={false}
              heroMap
            />
          </div>
        </div>
      </div>

    </div>
  )
}
