"use client"

import dynamic from "next/dynamic"
import { Bus, CalendarDays, CarFront, Sparkles } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import type { TripMode } from "@/lib/types"
import type { MapStop, OriginPoint } from "./itinerary-map"

const ItineraryMap = dynamic(() => import("./itinerary-map").then((m) => m.ItineraryMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
})

export interface TripHeroProps {
  title: string
  subtitle?: string
  daysCount: number
  tripTypeLabel: string
  highlights: string[]
  mode: TripMode
  stops: MapStop[]
  origin?: OriginPoint
  scrollTargetId?: string
}

export function TripHero({
  title,
  subtitle,
  daysCount,
  tripTypeLabel,
  highlights,
  mode,
  stops,
  origin,
  scrollTargetId = "itinerary-detail-view",
}: TripHeroProps) {
  const { t } = useI18n()
  const scrollToDetails = () => {
    const target = document.getElementById(scrollTargetId)
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const ModeIcon = mode === "road" ? CarFront : Bus
  const daysLabel = t(daysCount === 1 ? "dayCount" : "daysCount", { n: daysCount })

  return (
    <div className="relative mb-6 flex flex-col items-center justify-center overflow-hidden px-3 pt-6 pb-10 sm:px-4 sm:pt-10 md:pt-16 md:pb-16">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vw] max-h-[600px] w-[60vw] max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-[120px]" />

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-stretch gap-4 rounded-2xl border border-border/50 bg-background/80 p-4 shadow-2xl backdrop-blur-md md:flex-row md:gap-8 md:p-8 md:rounded-3xl">
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex flex-col gap-3 text-left md:gap-4">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground text-balance sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
              {title}
            </h1>

            {subtitle ? <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p> : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-muted/45 px-3 py-1.5 text-xs font-medium text-foreground">
                <CalendarDays className="size-3.5 text-brand" />
                {daysLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-muted/45 px-3 py-1.5 text-xs font-medium text-foreground">
                <ModeIcon className="size-3.5 text-brand" />
                {tripTypeLabel}
              </span>
            </div>

            <div className="pt-1 md:pt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:mb-3 md:text-sm">
                Highlights
              </p>
              <ul className="flex max-h-28 flex-wrap content-start gap-2 overflow-x-hidden overflow-y-auto pr-1 md:max-h-44 md:gap-2.5 md:custom-scrollbar">
                {highlights.map((highlight, index) => (
                  <li
                    key={`${highlight}-${index}`}
                    className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-brand/15 bg-brand-muted/35 px-3 py-1.5 text-xs font-medium text-foreground/90"
                  >
                    <Sparkles className="size-3.5 shrink-0 text-brand" />
                    <span className="min-w-0 truncate leading-tight">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="relative min-h-[220px] w-full overflow-hidden rounded-2xl border border-border/50 bg-background md:min-h-[320px] md:w-[40%]">
          <div className="absolute inset-0">
            <ItineraryMap stops={stops} selectedId={null} onSelect={() => {}} mode={mode} origin={origin} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToDetails}
        className="absolute bottom-8 hidden animate-bounce flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground sm:flex"
        aria-label="Scroll to View Full Itinerary"
      >
        <span className="text-sm font-medium tracking-wide">Scroll</span>
        <svg className="h-6 w-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
    </div>
  )
}
