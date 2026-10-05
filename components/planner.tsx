"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import type { GenerateTripPayload, TripMode } from "@/lib/types"
import { SiteHeader } from "./site-header"
import { ModeSelector } from "./mode-selector"
import { DEFAULT_ROAD_FORM, RoadTripConfigurator, type RoadFormValue } from "./road-trip-configurator"
import { DEFAULT_CITY_FORM, CityTripConfigurator, type CityFormValue } from "./city-trip-configurator"
import { GeneratingSkeleton } from "./generating-skeleton"
import { MouseDistanceCounter } from "./mouse-distance-counter"
import { Fuel, MapPinned, Route, AlertCircle, MapPin, Plane, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/locale-provider"
import { useAuth } from "@/components/auth/auth-provider"
import { useGuestTrips } from "@/hooks/use-guest-trips"
import { localizedPath } from "@/lib/paths"
import type { MessageKey } from "@/lib/i18n"

function ErrorExplanation({ error, t }: { error: string; t: (key: MessageKey, vars?: Record<string, string | number>) => string }) {
  // Gemini reasons are free text with unpredictable capitalization
  // (e.g. "City 'Xyz' not found"), so match case-insensitively —
  // otherwise the category is missed and the fallback repeats the title.
  const lower = error.toLowerCase()
  const isOverloaded = lower.includes("sovraccarico") || lower.includes("overloaded")
  const isImpossibleTrip = lower.includes("flight") || lower.includes("intercontinental") || lower.includes("volo")
  const isTooFar = lower.includes("too great") || lower.includes("troppo grande") || lower.includes("supera il limite")
  const isInvalidOrigin = lower.includes("origin") || lower.includes("origine") || lower.includes("partenza")
  const isInvalidDestination = lower.includes("destination") || lower.includes("destinazione")
  const isInvalidCity = lower.includes("city") || lower.includes("città")

  const getIcon = () => {
    if (isOverloaded) return <AlertCircle className="size-4" />
    if (isImpossibleTrip) return <Plane className="size-4" />
    if (isTooFar) return <AlertCircle className="size-4" />
    if (isInvalidOrigin || isInvalidDestination || isInvalidCity) return <MapPin className="size-4" />
    return <AlertCircle className="size-4" />
  }

  const getExplanation = () => {
    const tk = (k: string) => t(k as MessageKey)
    if (isOverloaded) {
      return (
        <>
          <p className="text-sm leading-relaxed">
            {tk("errorOverloadedExplanation")}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorOverloadedTip1")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorOverloadedTip2")}</li>
            <li className="flex items-start gap-2"><span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-destructive" />{tk("errorOverloadedTip3")}</li>
          </ul>
        </>
      )
    }
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

const PLANNER_DRAFT_KEY = "packron-planner-draft"

interface PlannerDraft {
  mode: TripMode
  roadForm: RoadFormValue
  cityForm: CityFormValue
  roadStep: number
  cityStep: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function sanitizeDraft(raw: unknown): PlannerDraft {
  const fallback: PlannerDraft = {
    mode: "road",
    roadForm: DEFAULT_ROAD_FORM,
    cityForm: DEFAULT_CITY_FORM,
    roadStep: 0,
    cityStep: 0,
  }
  if (!isRecord(raw)) return fallback
  const draft: PlannerDraft = { ...fallback }
  if (raw.mode === "road" || raw.mode === "city") draft.mode = raw.mode
  if (isRecord(raw.roadForm)) {
    draft.roadForm = {
      origin: typeof raw.roadForm.origin === "string" ? raw.roadForm.origin : DEFAULT_ROAD_FORM.origin,
      destination: typeof raw.roadForm.destination === "string" ? raw.roadForm.destination : DEFAULT_ROAD_FORM.destination,
      loop: typeof raw.roadForm.loop === "boolean" ? raw.roadForm.loop : DEFAULT_ROAD_FORM.loop,
      days: typeof raw.roadForm.days === "number" && raw.roadForm.days >= 2 && raw.roadForm.days <= 30
        ? Math.round(raw.roadForm.days)
        : DEFAULT_ROAD_FORM.days,
      routeTags: Array.isArray(raw.roadForm.routeTags) ? raw.roadForm.routeTags.filter((v): v is string => typeof v === "string") : DEFAULT_ROAD_FORM.routeTags,
      pace: typeof raw.roadForm.pace === "string" ? raw.roadForm.pace : DEFAULT_ROAD_FORM.pace,
      basecamp: typeof raw.roadForm.basecamp === "boolean" ? raw.roadForm.basecamp : DEFAULT_ROAD_FORM.basecamp,
      crew: Array.isArray(raw.roadForm.crew) ? raw.roadForm.crew.filter((v): v is string => typeof v === "string") : DEFAULT_ROAD_FORM.crew,
      vehicle: raw.roadForm.vehicle === "benzina" || raw.roadForm.vehicle === "diesel" || raw.roadForm.vehicle === "elettrica" || raw.roadForm.vehicle === "camper" || raw.roadForm.vehicle === "moto"
        ? raw.roadForm.vehicle
        : DEFAULT_ROAD_FORM.vehicle,
      consumption: typeof raw.roadForm.consumption === "string" ? raw.roadForm.consumption : DEFAULT_ROAD_FORM.consumption,
      evRange: typeof raw.roadForm.evRange === "string" ? raw.roadForm.evRange : DEFAULT_ROAD_FORM.evRange,
      kwhPrice: typeof raw.roadForm.kwhPrice === "string" ? raw.roadForm.kwhPrice : DEFAULT_ROAD_FORM.kwhPrice,
      avoidTolls: typeof raw.roadForm.avoidTolls === "boolean" ? raw.roadForm.avoidTolls : DEFAULT_ROAD_FORM.avoidTolls,
    }
  }
  if (isRecord(raw.cityForm)) {
    draft.cityForm = {
      city: typeof raw.cityForm.city === "string" ? raw.cityForm.city : DEFAULT_CITY_FORM.city,
      days: typeof raw.cityForm.days === "number" && raw.cityForm.days >= 1 && raw.cityForm.days <= 30
        ? Math.round(raw.cityForm.days)
        : DEFAULT_CITY_FORM.days,
      interests: Array.isArray(raw.cityForm.interests) ? raw.cityForm.interests.filter((v): v is string => typeof v === "string") : DEFAULT_CITY_FORM.interests,
      pace: typeof raw.cityForm.pace === "string" ? raw.cityForm.pace : DEFAULT_CITY_FORM.pace,
      notes: typeof raw.cityForm.notes === "string" ? raw.cityForm.notes : DEFAULT_CITY_FORM.notes,
    }
  }
  if (typeof raw.roadStep === "number" && raw.roadStep >= 0 && raw.roadStep <= 2) draft.roadStep = Math.round(raw.roadStep)
  if (typeof raw.cityStep === "number" && raw.cityStep >= 0 && raw.cityStep <= 1) draft.cityStep = Math.round(raw.cityStep)
  return draft
}

export function Planner() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { trips: guestTrips } = useGuestTrips()
  const [mode, setMode] = useState<TripMode>("road")
  const [roadForm, setRoadForm] = useState(DEFAULT_ROAD_FORM)
  const [cityForm, setCityForm] = useState(DEFAULT_CITY_FORM)
  const [roadStep, setRoadStep] = useState(0)
  const [cityStep, setCityStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generationKey, setGenerationKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const wizardCardRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<PlannerDraft>({
    mode: "road",
    roadForm: DEFAULT_ROAD_FORM,
    cityForm: DEFAULT_CITY_FORM,
    roadStep: 0,
    cityStep: 0,
  })
  const didLoadDraftRef = useRef(false)

  // Generation navigates to /trip/[id] (unmounting Planner), so drafts are
  // persisted to localStorage: Back from a trip restores the inputs instead
  // of a fresh blank form. Rehydrate in an effect (not the useState
  // initializer) to avoid a server/client hydration mismatch.
  useEffect(() => {
    if (didLoadDraftRef.current) return
    didLoadDraftRef.current = true
    try {
      const raw = window.localStorage.getItem(PLANNER_DRAFT_KEY)
      if (!raw) return
      const draft = sanitizeDraft(JSON.parse(raw))
      draftRef.current = draft
      setMode(draft.mode)
      setRoadForm(draft.roadForm)
      setCityForm(draft.cityForm)
      setRoadStep(draft.roadStep)
      setCityStep(draft.cityStep)
    } catch {
      // Corrupt draft or blocked storage — fall back to defaults.
    }
  }, [])

  // Write-through persistence: every user change saves synchronously in the
  // event handler. There is deliberately NO persist effect — an effect that
  // writes on mount would store blank defaults before the rehydrated values
  // land, and dev double-effects would then re-read that clobbered blank
  // draft (this is what broke the first version of this fix).
  const persistDraft = (patch: Partial<PlannerDraft>) => {
    draftRef.current = { ...draftRef.current, ...patch }
    try {
      window.localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify(draftRef.current))
    } catch {
      // Quota/private mode — the planner works without persistence.
    }
  }
  const handleMode = (next: TripMode) => {
    setMode(next)
    persistDraft({ mode: next })
  }
  const handleRoadForm = (next: RoadFormValue) => {
    setRoadForm(next)
    persistDraft({ roadForm: next })
  }
  const handleCityForm = (next: CityFormValue) => {
    setCityForm(next)
    persistDraft({ cityForm: next })
  }
  const handleRoadStep = (next: number) => {
    setRoadStep(next)
    persistDraft({ roadStep: next })
  }
  const handleCityStep = (next: number) => {
    setCityStep(next)
    persistDraft({ cityStep: next })
  }

  // Start over: clear both drafts (and their stored copy) back to defaults.
  const resetDraft = () => {
    const fresh: PlannerDraft = {
      mode: "road",
      roadForm: DEFAULT_ROAD_FORM,
      cityForm: DEFAULT_CITY_FORM,
      roadStep: 0,
      cityStep: 0,
    }
    draftRef.current = fresh
    setMode(fresh.mode)
    setRoadForm(fresh.roadForm)
    setCityForm(fresh.cityForm)
    setRoadStep(fresh.roadStep)
    setCityStep(fresh.cityStep)
    setError(null)
    try {
      window.localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify(fresh))
    } catch {
      // Quota/private mode — in-memory reset is enough.
    }
  }

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
      let data: { id?: string; error?: string }
      try {
        data = (await res.json()) as { id?: string; error?: string }
      } catch {
        throw new Error(t("apiUnexpected"))
      }
      if (!res.ok || !data.id) {
        throw new Error(data.error || t("generateFail"))
      }
      router.push(localizedPath(locale, `/trip/${encodeURIComponent(data.id)}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("generateUnexpected"))
    } finally {
      setLoading(false)
    }
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
                    width={256}
                    height={256}
                    priority
                    aria-hidden="true"
                    className="relative h-full max-h-full w-auto object-contain"
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
              <div className="mb-8 flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{t("configTitle")}</h2>
                  <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">{t("configSubtitle")}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetDraft}
                  disabled={loading}
                  aria-label={t("resetForm")}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-4" />
                  {t("resetForm")}
                </Button>
              </div>

              {(mode === "road" ? roadStep : cityStep) === 0 ? (
                <div className="mb-8">
                  <ModeSelector
                    mode={mode}
                    onChange={handleMode}
                  />
                </div>
              ) : null}

              {error ? (
                <ErrorExplanation error={error} t={t} />
              ) : null}

              {mode === "road" ? (
                <RoadTripConfigurator
                  onGenerate={generate}
                  loading={loading}
                  value={roadForm}
                  onChange={handleRoadForm}
                  step={roadStep}
                  onStepChange={handleRoadStep}
                />
              ) : (
                <CityTripConfigurator
                  onGenerate={generate}
                  loading={loading}
                  value={cityForm}
                  onChange={handleCityForm}
                  step={cityStep}
                  onStepChange={handleCityStep}
                />
              )}

              {!authLoading && !user && guestTrips.length > 0 ? (
                <section className="mt-8 border-t border-border pt-6" aria-labelledby="recent-trips-heading">
                  <h3 id="recent-trips-heading" className="text-sm font-semibold text-foreground">{t("recentTrips")}</h3>
                  <ul className="mt-2 divide-y divide-border">
                    {guestTrips.map((trip) => (
                      <li key={trip.id}>
                        <Link
                          href={localizedPath(locale, `/trip/${encodeURIComponent(trip.id)}`)}
                          className="flex min-w-0 items-center justify-between gap-3 py-2 text-sm text-foreground hover:text-brand"
                        >
                          <span className="min-w-0 truncate font-medium">{trip.title}</span>
                          {trip.destination ? <span className="shrink-0 truncate text-xs text-muted-foreground">{trip.destination}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
