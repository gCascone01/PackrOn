"use client"

import Image from "next/image"
import { useState } from "react"
import type { GenerateTripPayload, Itinerary, TripMode } from "@/lib/types"
import { SiteHeader } from "./site-header"
import { ModeSelector } from "./mode-selector"
import { RoadTripConfigurator } from "./road-trip-configurator"
import { CityTripConfigurator } from "./city-trip-configurator"
import { ResultView } from "./result/result-view"
import { GeneratingSkeleton } from "./generating-skeleton"
import { Fuel, MapPinned, Route } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import type { MessageKey } from "@/lib/i18n"

export function Planner() {
  const { t, locale } = useI18n()
  const [mode, setMode] = useState<TripMode>("road")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Itinerary | null>(null)

  const features: Array<{ icon: typeof Route; title: MessageKey; text: MessageKey }> = [
    { icon: Route, title: "featureRouteTitle", text: "featureRouteText" },
    { icon: Fuel, title: "featureFuelTitle", text: "featureFuelText" },
    { icon: MapPinned, title: "featureNavTitle", text: "featureNavText" },
  ]

  const generate = async (payload: GenerateTripPayload) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/generate-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale }),
      })
      const data = (await res.json()) as { itinerary?: Itinerary; error?: string }
      if (!res.ok || !data.itinerary) {
        throw new Error(data.error || t("generateFail"))
      }
      setResult(data.itinerary)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : t("generateUnexpected"))
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader onBrandClick={() => setResult(null)} />
        <ResultView initial={result} onBack={() => setResult(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:h-[calc(100vh-5rem)] lg:overflow-hidden lg:py-8">
        <div className="grid h-full items-start gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="relative flex flex-col gap-8 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden">
            <div className="relative z-10 flex flex-col gap-5">
              <div className="h-8" aria-hidden="true" />
              <div className="h-8" aria-hidden="true" />

              <h1 className="font-display text-[2.375rem] font-extrabold leading-[1.05] tracking-tight text-foreground text-balance sm:text-[3.125rem]">
                <span className="relative inline-block">
                  {t("heroTitle")}
                  <Image
                    src="/logo.png"
                    alt=""
                    width={620}
                    height={220}
                    priority
                    aria-hidden="true"
                    className="pointer-events-none absolute left-full top-1/2 ml-6 hidden h-36 w-auto -translate-y-3/4 object-contain opacity-100 lg:block sm:h-40"
                  />
                </span>
                <br />
                <span className="text-brand">{t("heroAccent")}</span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
                {t("heroBody")}
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {features.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
                    <f.icon className="size-4.5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t(f.title)}</div>
                    <div className="text-sm leading-relaxed text-muted-foreground">{t(f.text)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative max-h-[calc(100vh-8rem)] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/[0.03] [scrollbar-width:none] sm:p-8 [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <div className="absolute inset-0 z-10 overflow-auto rounded-3xl bg-card p-6 sm:p-8">
                <GeneratingSkeleton />
              </div>
            ) : null}

            <div className={loading ? "invisible" : undefined}>
              <div className="mb-6 flex flex-col gap-1">
                <h2 className="font-display text-xl font-bold text-foreground">{t("configTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("configSubtitle")}</p>
              </div>

              <div className="mb-7">
                <ModeSelector mode={mode} onChange={setMode} />
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive"
                >
                  {error}
                </div>
              ) : null}

              {mode === "road" ? (
                <RoadTripConfigurator onGenerate={generate} loading={loading} />
              ) : (
                <CityTripConfigurator onGenerate={generate} loading={loading} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
