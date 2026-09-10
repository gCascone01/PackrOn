"use client"

import { useState } from "react"
import { locateCityMessageKey, resolveCurrentCity } from "@/lib/current-city"
import {
  Chip,
  Field,
  NumberStepper,
  OptionCard,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/form-controls"
import { StepProgress } from "@/components/step-progress"
import { TravelThought } from "@/components/travel-thought"
import { WizardPreview } from "@/components/wizard-preview"
import { Button } from "@/components/ui/button"
import type { GenerateTripPayload, VehicleType } from "@/lib/types"
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CarFront,
  Coffee,
  FileText,
  Fuel,
  Gauge,
  Map,
  MapPin,
  Navigation,
  ReceiptText,
  Repeat,
  Route,
  Scale,
  Sparkles,
  Users,
} from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import type { MessageKey } from "@/lib/i18n"

const CREW_OPTIONS: Array<{ id: string; label: MessageKey }> = [
  { id: "solo", label: "crewSolo" },
  { id: "couple", label: "crewCouple" },
  { id: "family", label: "crewFamily" },
  { id: "friends", label: "crewFriends" },
  { id: "dog", label: "crewDog" },
]

const VEHICLE_OPTIONS: Array<{ id: VehicleType; label: MessageKey }> = [
  { id: "benzina", label: "vehiclePetrol" },
  { id: "diesel", label: "vehicleDiesel" },
  { id: "elettrica", label: "vehicleEv" },
  { id: "camper", label: "vehicleCamper" },
  { id: "moto", label: "vehicleMoto" },
]

export function RoadTripConfigurator({
  onGenerate,
  loading,
  onStepChange,
}: {
  onGenerate: (payload: GenerateTripPayload) => void
  loading: boolean
  onStepChange?: (step: number) => void
}) {
  const { t, locale } = useI18n()
  const [step, setStep] = useState(0)
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [loop, setLoop] = useState(true)
  const [days, setDays] = useState(5)
  const [pace, setPace] = useState("balanced")
  const [basecamp, setBasecamp] = useState(false)
  const [crew, setCrew] = useState<string[]>(["couple"])
  const [vehicle, setVehicle] = useState<VehicleType>("diesel")
  const [consumption, setConsumption] = useState("6.5")
  const [avoidTolls, setAvoidTolls] = useState(false)
  const [notes, setNotes] = useState("")

  const steps = [t("roadStep1"), t("roadStep2"), t("roadStep3")]
  const paceOptions = [
    { id: "relax", icon: Coffee, title: t("paceRelax"), desc: t("paceRelaxDesc") },
    { id: "balanced", icon: Scale, title: t("paceBalanced"), desc: t("paceBalancedDesc") },
    { id: "fast", icon: Gauge, title: t("paceFast"), desc: t("paceFastDesc") },
  ]

  const toggle = (list: string[], value: string, set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const canGenerate = origin.trim().length > 1 && destination.trim().length > 1

  const changeStep = (nextStep: number) => {
    if (nextStep > step) {
      if (step === 0) {
        if (!origin.trim()) {
          setStepError(t("originRequired"))
          return
        }
        if (!destination.trim()) {
          setStepError(t("destinationRequired"))
          return
        }
      }
      setStepError(null)
    }
    setStep(nextStep)
    onStepChange?.(nextStep)
  }

  const submit = () => {
    if (!canGenerate) return
    onGenerate({
      mode: "road",
      origin: origin.trim(),
      destination: destination.trim(),
      days,
      pace,
      routeTags: [],
      loop,
      basecamp,
      crew: crew.map((id) => t(CREW_OPTIONS.find((o) => o.id === id)!.label)),
      vehicle,
      consumption: Number.parseFloat(consumption) || 6.5,
      avoidTolls,
      notes: notes.trim(),
    })
  }

  return (
    <div className="flex flex-col gap-7">
      <StepProgress steps={steps} current={step} />

      <WizardPreview
        mode="road"
        label={t("previewLabel")}
        title={origin.trim() || t("previewOrigin")}
        detail={destination.trim() || t("previewDestination")}
        meta={vehicle === "elettrica" ? "EV" : vehicle}
        accent={pace === "relax" ? "green" : pace === "fast" ? "amber" : "brand"}
      />

      {step === 0 && (
        <div key="road-step-0" className="animate-step-transition flex flex-col gap-6">
          {stepError && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive">
              {stepError}
            </div>
          )}
          <Field label={t("origin")} icon={<MapPin className="size-4" />}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <TextInput
                  className="pl-9"
                  placeholder={t("originPlaceholder")}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 shrink-0"
                disabled={locating || loading}
                onClick={async () => {
                  setLocationError(null)
                  setLocating(true)
                  try {
                    const city = await resolveCurrentCity(locale)
                    setOrigin(city)
                  } catch (error) {
                    setLocationError(t(locateCityMessageKey(error)))
                  } finally {
                    setLocating(false)
                  }
                }}
              >
                <Navigation className="size-4" />
                {locating ? t("locating") : t("useLocation")}
              </Button>
            </div>
            {locationError ? (
              <p role="alert" className="text-xs text-destructive">
                {locationError}
              </p>
            ) : null}
          </Field>

          <Field label={t("destination")} icon={<Map className="size-4" />}>
            <TextArea
              placeholder={t("destinationPlaceholder")}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("itineraryType")} icon={<Route className="size-4" />}>
              <div className="grid grid-cols-2 gap-2">
                <OptionCard active={loop} onClick={() => setLoop(true)} title={t("loop")} icon={<Repeat className="size-4" />} />
                <OptionCard active={!loop} onClick={() => setLoop(false)} title={t("oneWay")} icon={<ArrowRight className="size-4" />} />
              </div>
            </Field>
            <Field label={t("duration")} icon={<CalendarDays className="size-4" />}>
              <NumberStepper value={days} min={2} max={30} unit={t("daysUnit")} onChange={setDays} />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div key="road-step-1" className="animate-step-transition flex flex-col gap-6">
          <Field label={t("drivingPace")} icon={<Gauge className="size-4" />}>
            <div className="grid gap-2 sm:grid-cols-3">
              {paceOptions.map((p) => (
                <OptionCard
                  key={p.id}
                  active={pace === p.id}
                  onClick={() => setPace(p.id)}
                  title={p.title}
                  description={p.desc}
                  icon={<p.icon className="size-4" />}
                />
              ))}
            </div>
          </Field>

          <Field label={t("stays")} icon={<BedDouble className="size-4" />}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <OptionCard active={!basecamp} onClick={() => setBasecamp(false)} title={t("stayMove")} description={t("stayMoveDesc")} />
              <OptionCard active={basecamp} onClick={() => setBasecamp(true)} title={t("stayBase")} description={t("stayBaseDesc")} />
            </div>
          </Field>

          <Field label={t("onboard")} hint={t("multiSelect")} icon={<Users className="size-4" />}>
            <div className="flex flex-wrap gap-2">
              {CREW_OPTIONS.map((c) => (
                <Chip key={c.id} active={crew.includes(c.id)} onClick={() => toggle(crew, c.id, setCrew)}>
                  {t(c.label)}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div key="road-step-2" className="animate-step-transition flex flex-col gap-6">
          <Field label={t("vehicle")} icon={<CarFront className="size-4" />}>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_OPTIONS.map((v) => (
                <Chip key={v.id} active={vehicle === v.id} onClick={() => setVehicle(v.id)}>
                  {t(v.label)}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("consumption")} hint={t("consumptionHint")} icon={<Fuel className="size-4" />}>
            <div className="flex items-center gap-2">
              <TextInput
                type="number"
                step="0.1"
                className="max-w-[140px]"
                value={consumption}
                onChange={(e) => setConsumption(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">L / 100 km</span>
            </div>
          </Field>

          <Field label={t("tolls")} icon={<ReceiptText className="size-4" />}>
            <Toggle checked={avoidTolls} onChange={setAvoidTolls} label={t("avoidTolls")} />
          </Field>

          <Field label={t("notes")} hint={t("optional")} icon={<FileText className="size-4" />}>
            <TextArea
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
              <span className="text-xs text-muted-foreground">{t("generateNeedRoute")}</span>
            ) : null}
          </div>
        )}
      </div>
      <TravelThought trigger={step} className="pb-1" />
    </div>
  )
}
