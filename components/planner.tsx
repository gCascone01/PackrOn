"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import type { GenerateTripPayload, Itinerary, TripMode } from "@/lib/types"
import { SiteHeader } from "./site-header"
import { ModeSelector } from "./mode-selector"
import { RoadTripConfigurator } from "./road-trip-configurator"
import { CityTripConfigurator } from "./city-trip-configurator"
import { ResultView } from "./result/result-view"
import { GeneratingSkeleton } from "./generating-skeleton"
import { MouseDistanceCounter } from "./mouse-distance-counter"
import { Fuel, MapPinned, Route, AlertCircle, MapPin, Plane, HelpCircle } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import type { MessageKey } from "@/lib/i18n"

function ErrorExplanation({ error, t }: { error: string; t: (key: MessageKey, vars?: Record<string, string | number>) => string }) {
  // Gemini reasons are free text with unpredictable capitalization
  // (e.g. "City 'Xyz' not found"), so match case-insensitively —
  // otherwise the category is missed and the fallback repeats the title.
  const lower = error.toLowerCase()
  const isImpossibleTrip = lower.includes("flight") || lower.includes("intercontinental") || lower.includes("volo")
  const isTooFar = lower.includes("too great") || lower.includes("troppo grande") || lower.includes("supera il limite")
  const isInvalidOrigin = lower.includes("origin") || lower.includes("origine") || lower.includes("partenza")
  const isInvalidDestination = lower.includes("destination") || lower.includes("destinazione")
  const isInvalidCity = lower.includes("city") || lower.includes("città")

  const getIcon = () => {
    if (isImpossibleTrip) return <Plane className="size-4" />
    if (isTooFar) return <AlertCircle className="size-4" />
    if (isInvalidOrigin || isInvalidDestination || isInvalidCity) return <MapPin className="size-4" />
    return <AlertCircle className="size-4" />
  }

  const getExplanation = () => {
    const tk = (k: string) => t(k as MessageKey)
    if (isImpossibleTrip) {
      return (
        <>
          <p className="text-sm leading-relaxed">
            {tk("errorImpossibleTripExplanation")}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorImpossibleTripTip1")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorImpossibleTripTip2")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorImpossibleTripTip3")}</li>
          </ul>
        </>
      )
    }
    // Checked before origin/destination: the apiTooFar message itself mentions
    // "origin and destination", so it would otherwise match the wrong category.
    if (isTooFar) {
      return (
        <>
          <p className="text-sm leading-relaxed">
            {tk("errorTooFarExplanation")}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorTooFarTip1")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorTooFarTip2")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorTooFarTip3")}</li>
          </ul>
        </>
      )
    }
    if (isInvalidOrigin) {
      return (
        <>
          <p className="text-sm leading-relaxed">
            {tk("errorInvalidOriginExplanation")}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidOriginTip1")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidOriginTip2")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidOriginTip3")}</li>
          </ul>
        </>
      )
    }
    if (isInvalidDestination) {
      return (
        <>
          <p className="text-sm leading-relaxed">
            {tk("errorInvalidDestinationExplanation")}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidDestinationTip1")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidDestinationTip2")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidDestinationTip3")}</li>
          </ul>
        </>
      )
    }
    if (isInvalidCity) {
      return (
        <>
          <p className="text-sm leading-relaxed">
            {tk("errorInvalidCityExplanation")}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidCityTip1")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidCityTip2")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorInvalidCityTip3")}</li>
          </ul>
        </>
      )
    }
    // Unknown error: the title above already shows the message, so render
    // nothing extra instead of repeating the same text.
    return null
  }

  const explanation = getExplanation()

  return (
    <div role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-destructive">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{error}</p>
          {explanation ? <div className="mt-3">{explanation}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function Planner() {
  const { t, locale } = useI18n()
  const [mode, setMode] = useState<TripMode>("road")
  const [wizardStep, setWizardStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generationKey, setGenerationKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Itinerary | null>(null)
  const wizardCardRef = useRef<HTMLDivElement>(null)

  const features: Array<{ icon: typeof Route; title: MessageKey; text: MessageKey }> = [
    { icon: Route, title: "featureRouteTitle", text: "featureRouteText" },
    { icon: Fuel, title: "featureFuelTitle", text: "featureFuelText" },
    { icon: MapPinned, title: "featureNavTitle", text: "featureNavText" },
  ]

  const generate = async (payload: GenerateTripPayload) => {
    if (wizardCardRef.current) wizardCardRef.current.scrollTop = 0
    setLoading(true)
    setGenerationKey((key) => key + 1)
    setError(null)
    try {
      const res = await fetch("/api/generate-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale }),
      })
      // The platform may answer with an HTML error page instead of JSON
      // (e.g. a timeout page for very long generations) — never let
      // res.json() throw a raw SyntaxError at the user.
      const contentType = res.headers.get("content-type") ?? ""
      if (!contentType.includes("application/json")) {
        throw new Error(t("apiUnexpected"))
      }
      let data: { itinerary?: Itinerary; error?: string }
      try {
        data = (await res.json()) as { itinerary?: Itinerary; error?: string }
      } catch {
        throw new Error(t("apiUnexpected"))
      }
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
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:h-[calc(100vh-5rem)] lg:overflow-hidden lg:py-10">
        <div className="grid h-full items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="hero-stage relative flex min-w-0 flex-col gap-6 p-4 sm:p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden lg:p-6 lg:pb-8">
            <div className="relative z-10 flex flex-col gap-5">
              <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="min-w-0 flex flex-col gap-4">
                  <h1 className="animate-hero-reveal font-display text-[2.375rem] font-extrabold leading-[1.02] tracking-tight text-foreground text-balance sm:text-[3.125rem]">
                    {t("heroTitle")}
                    <br />
                    <span className="text-brand">{t("heroAccent")}</span>
                  </h1>
                  <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
                    {t("heroBody")}
                  </p>
                  <MouseDistanceCounter className="max-w-md" />
                </div>
                <div className="animate-hero-float relative mx-auto flex h-24 w-32 shrink-0 translate-y-4 items-center justify-center rounded-[1.75rem] border border-brand/15 bg-card/70 p-2.5 shadow-xl shadow-brand/10 sm:h-28 sm:w-40 lg:mx-0 lg:translate-y-8">
                  <span className="absolute inset-2 rounded-[1.4rem] border border-dashed border-brand/20" aria-hidden="true" />
                  <Image
                    src="/logo.png"
                    alt=""
                    width={620}
                    height={220}
                    priority
                    aria-hidden="true"
                    className="relative h-auto w-full object-contain"
                  />
                </div>
              </div>
            </div>

            <ul className="relative z-10 grid gap-2 sm:grid-cols-3 lg:grid-cols-3">
              {features.map((f) => (
                <li key={f.title} className="group flex min-w-0 flex-col gap-2 rounded-2xl border border-transparent p-2 transition-colors duration-200 hover:border-brand/15 hover:bg-card/70">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand transition-transform duration-200 group-hover:scale-105">
                    <f.icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold leading-snug text-foreground">{t(f.title)}</div>
                    <div className="text-xs leading-relaxed text-muted-foreground">{t(f.text)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div ref={wizardCardRef} className="relative max-h-[calc(100vh-8rem)] overflow-y-auto rounded-3xl border border-white/60 bg-card/70 p-7 shadow-2xl shadow-black/[0.12] ring-1 ring-brand/10 backdrop-blur-xl backdrop-saturate-150 [scrollbar-width:none] sm:p-9 [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <div className="absolute inset-0 z-10 overflow-auto rounded-3xl bg-card/85 p-6 backdrop-blur-xl sm:p-8">
                <GeneratingSkeleton trigger={generationKey} />
              </div>
            ) : null}

            <div className={loading ? "invisible" : undefined}>
              <div className="mb-8 flex flex-col gap-2">
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{t("configTitle")}</h2>
                <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">{t("configSubtitle")}</p>
              </div>

              {wizardStep === 0 ? (
                <div className="mb-8">
                  <ModeSelector
                    mode={mode}
                    onChange={(nextMode) => {
                      setMode(nextMode)
                      setWizardStep(0)
                    }}
                  />
                </div>
              ) : null}

              {error ? (
                <ErrorExplanation error={error} t={t} />
              ) : null}

              {mode === "road" ? (
                <RoadTripConfigurator onGenerate={generate} loading={loading} onStepChange={setWizardStep} />
              ) : (
                <CityTripConfigurator onGenerate={generate} loading={loading} onStepChange={setWizardStep} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
