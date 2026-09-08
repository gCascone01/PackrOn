"use client"

import type { Itinerary } from "@/lib/types"
import { fuelCost, formatEur, formatKm, tollsCost, totalCost, totalDistanceKm } from "@/lib/costs"
import { AlertTriangle, Fuel, Receipt, Route, Ticket } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

export function CostSummary({ itinerary }: { itinerary: Itinerary }) {
  const { t, locale } = useI18n()
  const km = totalDistanceKm(itinerary)
  const fuel = fuelCost(itinerary)
  const tolls = tollsCost(itinerary)
  const computedTotal = totalCost(itinerary)
  const { consumption, fuelPrice } = itinerary.vehicle
  const fuelLabel = itinerary.estimatedFuelCostRange || formatEur(fuel, locale)
  const totalLabel = itinerary.estimatedFuelCostRange
    ? itinerary.estimatedFuelCostRange
    : formatEur(computedTotal, locale)

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Receipt className="size-4 text-brand" />
        <h3 className="font-display text-sm font-bold text-foreground">{t("costTitle")}</h3>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat icon={<Route className="size-4" />} label={t("costDistance")} value={formatKm(km, locale)} />
        <Stat icon={<Fuel className="size-4" />} label={t("costFuel")} value={fuelLabel} />
        <Stat
          icon={<Ticket className="size-4" />}
          label={t("costTolls")}
          value={tolls > 0 ? formatEur(tolls, locale) : itinerary.tollNotices.length ? t("seeAlerts") : formatEur(0, locale)}
        />
        <Stat icon={<Receipt className="size-4" />} label={t("costTotal")} value={totalLabel} highlight />
      </div>

      <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {t("fuelFormula")}{" "}
        <span className="font-medium text-foreground">
          ({formatKm(km, locale)} / 100) × {consumption} L × {formatEur(fuelPrice, locale)}/L
        </span>{" "}
        = {formatEur(fuel, locale)}
      </p>

      {itinerary.tollNotices.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("alerts")}
          </span>
          {itinerary.tollNotices.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="flex-1 text-xs leading-relaxed text-amber-900">
                <span className="font-semibold">{n.country}:</span> {n.label}
                {n.cost > 0 ? (
                  <span className="ml-1 font-semibold">· {t("about", { value: formatEur(n.cost, locale) })}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl bg-brand p-3 text-brand-foreground"
          : "rounded-xl border border-border bg-background p-3"
      }
    >
      <div className={`flex items-center gap-1.5 text-xs ${highlight ? "text-brand-foreground/80" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  )
}
