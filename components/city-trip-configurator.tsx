"use client"

import { useState } from "react"
import { Chip, Field, NumberStepper, OptionCard, TextArea, TextInput } from "@/components/form-controls"
import { StepProgress } from "@/components/step-progress"
import { TravelThought } from "@/components/travel-thought"
import { WizardPreview } from "@/components/wizard-preview"
import { Button } from "@/components/ui/button"
import type { GenerateTripPayload } from "@/lib/types"
import { ArrowRight, CalendarDays, Compass, FileText, Gauge, MapPin, Sparkles } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import type { MessageKey } from "@/lib/i18n"

const INTEREST_OPTIONS: Array<{ id: string; label: MessageKey }> = [
  { id: "art", label: "interestArt" },
  { id: "food", label: "interestFood" },
  { id: "nightlife", label: "interestNightlife" },
  { id: "shopping", label: "interestShopping" },
  { id: "architecture", label: "interestArch" },
  { id: "parks", label: "interestParks" },
  { id: "views", label: "interestViews" },
  { id: "kids", label: "interestKids" },
]

export type CityFormValue = {
  city: string
  days: number
  interests: string[]
  pace: string
  notes: string
}

export const DEFAULT_CITY_FORM: CityFormValue = {
  city: "",
  days: 3,
  interests: ["art", "food"],
  pace: "balanced",
  notes: "",
}

export function CityTripConfigurator({
  onGenerate,
  loading,
  value,
  onChange,
  step,
  onStepChange,
}: {
  onGenerate: (payload: GenerateTripPayload) => void
  loading: boolean
  value: CityFormValue
  onChange: (next: CityFormValue) => void
  step: number
  onStepChange?: (step: number) => void
}) {
  const { t } = useI18n()
  const { city, days, interests, pace, notes } = value
  const patch = (p: Partial<CityFormValue>) => onChange({ ...value, ...p })
  const setCity = (city: string) => patch({ city })
  const setDays = (days: number) => patch({ days })
  const setPace = (pace: string) => patch({ pace })
  const setNotes = (notes: string) => patch({ notes })
  const [stepError, setStepError] = useState<string | null>(null)

  const steps = [t("cityStep1"), t("cityStep2")]
  const paceOptions = [
    { id: "chill", title: t("cityChill") },
    { id: "balanced", title: t("cityBalanced") },
    { id: "packed", title: t("cityPacked") },
  ]

  const toggle = (toggleValue: string) =>
    patch({
      interests: interests.includes(toggleValue)
        ? interests.filter((v) => v !== toggleValue)
        : [...interests, toggleValue],
    })

  const canGenerate = city.trim().length > 1

  const changeStep = (nextStep: number) => {
    if (nextStep > step) {
      if (step === 0) {
        if (!city.trim()) {
          setStepError(t("cityRequired"))
          return
        }
      }
      setStepError(null)
    }
    onStepChange?.(nextStep)
  }

  const submit = () => {
    if (!canGenerate) return
    onGenerate({
      mode: "city",
      city: city.trim(),
      days,
      pace,
      interests: interests.map((id) => t(INTEREST_OPTIONS.find((o) => o.id === id)!.label)),
      notes: notes.trim(),
    })
  }

  return (
    <div className="flex flex-col gap-7">
      <StepProgress steps={steps} current={step} />

      <WizardPreview
        mode="city"
        label={t("previewLabel")}
        title={city.trim() || t("previewCity")}
        detail={
          interests.length > 0
            ? interests
                .slice(0, 2)
                .map((id) => t(INTEREST_OPTIONS.find((option) => option.id === id)?.label ?? "interests"))
                .join(" · ")
            : t("previewInterests")
        }
          meta={`${days} ${t("daysShort")}`}
        accent={pace === "chill" ? "green" : pace === "packed" ? "amber" : "brand"}
      />

      {step === 0 && (
        <div key="city-step-0" className="animate-step-transition flex flex-col gap-6">
          {stepError && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive">
              {stepError}
            </div>
          )}
          <Field label={t("cityLabel")} icon={<MapPin className="size-4" />}>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <TextInput
                className="pl-9"
                placeholder={t("cityPlaceholder")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </Field>

          <Field label={t("howManyDays")} icon={<CalendarDays className="size-4" />}>
            <NumberStepper value={days} min={1} max={10} unit={t("daysUnit")} onChange={setDays} />
          </Field>

          <Field label={t("notes")} hint={t("optional")} icon={<FileText className="size-4" />}>
            <TextArea
              placeholder={t("cityNotesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div key="city-step-1" className="animate-step-transition flex flex-col gap-6">
          <Field label={t("interests")} hint={t("multiSelect")} icon={<Compass className="size-4" />}>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((c) => (
                <Chip key={c.id} active={interests.includes(c.id)} onClick={() => toggle(c.id)}>
                  {t(c.label)}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("dailyPace")} icon={<Gauge className="size-4" />}>
            <div className="grid gap-2 sm:grid-cols-3">
              {paceOptions.map((p) => (
                <OptionCard key={p.id} active={pace === p.id} onClick={() => setPace(p.id)} title={p.title} />
              ))}
            </div>
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => changeStep(Math.max(0, step - 1))}
          disabled={step === 0 || loading}
        >
          {t("back")}
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" size="lg" className="animate-hero-reveal [animation-delay:160ms]" onClick={() => changeStep(step + 1)}>
            {t("continue")}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <Button type="button" size="lg" className="animate-hero-reveal [animation-delay:160ms]" onClick={submit} disabled={loading || !canGenerate}>
              <Sparkles className="size-4" />
              {loading ? t("generating") : t("generate")}
            </Button>
            {!canGenerate ? (
              <span className="text-xs text-muted-foreground">{t("generateNeedCity")}</span>
            ) : null}
          </div>
        )}
      </div>
      <TravelThought trigger={step} className="pb-1" />
    </div>
  )
}
