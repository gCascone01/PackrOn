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
import { Button } from "@/components/ui/button"
import type { GenerateTripPayload, VehicleType } from "@/lib/types"
import {
  ArrowRight,
  Coffee,
  Gauge,
  MapPin,
  Navigation,
  Repeat,
  Scale,
  Sparkles,
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
}: {
  onGenerate: (payload: GenerateTripPayload) => void
  loading: boolean
}) {
  const { t, locale } = useI18n()
  const [step, setStep] = useState(0)
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
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
    <div className="flex flex-col gap-6">
      <StepProgress steps={steps} current={step} />

      {step === 0 && (
        <div className="flex flex-col gap-5">
          <Field label={t("origin")}>
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

          <Field label={t("destination")}>
            <TextArea
              placeholder={t("destinationPlaceholder")}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("itineraryType")}>
              <div className="grid grid-cols-2 gap-2">
                <OptionCard active={loop} onClick={() => setLoop(true)} title={t("loop")} icon={<Repeat className="size-4" />} />
                <OptionCard active={!loop} onClick={() => setLoop(false)} title={t("oneWay")} icon={<ArrowRight className="size-4" />} />
              </div>
            </Field>
            <Field label={t("duration")}>
              <NumberStepper value={days} min={2} max={30} unit={t("daysUnit")} onChange={setDays} />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <Field label={t("drivingPace")}>
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

          <Field label={t("stays")}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <OptionCard active={!basecamp} onClick={() => setBasecamp(false)} title={t("stayMove")} description={t("stayMoveDesc")} />
              <OptionCard active={basecamp} onClick={() => setBasecamp(true)} title={t("stayBase")} description={t("stayBaseDesc")} />
            </div>
          </Field>

          <Field label={t("onboard")} hint={t("multiSelect")}>
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
        <div className="flex flex-col gap-5">
          <Field label={t("vehicle")}>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_OPTIONS.map((v) => (
                <Chip key={v.id} active={vehicle === v.id} onClick={() => setVehicle(v.id)}>
                  {t(v.label)}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("consumption")} hint={t("consumptionHint")}>
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

          <Field label={t("tolls")}>
            <Toggle checked={avoidTolls} onChange={setAvoidTolls} label={t("avoidTolls")} />
          </Field>

          <Field label={t("notes")} hint={t("optional")}>
            <TextArea
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || loading}
        >
          {t("back")}
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" size="lg" onClick={() => setStep((s) => s + 1)}>
            {t("continue")}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <Button type="button" size="lg" onClick={submit} disabled={loading || !canGenerate}>
              <Sparkles className="size-4" />
              {loading ? t("generating") : t("generate")}
            </Button>
            {!canGenerate ? (
              <span className="text-xs text-muted-foreground">{t("generateNeedRoute")}</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
