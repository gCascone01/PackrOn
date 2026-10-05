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
  const isEv = itinerary.vehicle.type === "elettrica"
  const energyUnit = isEv ? "kWh" : "L"
  // Both rows are deterministic: (km/100) x consumption x live price.
  // Gemini's estimatedFuelCostRange is deliberately NOT shown — it is a
  // free-text guess that routinely contradicts its own km estimate (e.g.
  // "450€ - 550€" next to a computed €157), which made every total look
  // broken. The field stays in the type/DB for compatibility.
  const fuelLabel = formatEur(fuel, locale)
  const totalLabel = formatEur(computedTotal, locale)
  const hasLiveTolls = typeof itinerary.tollTotalEur === "number"
  const hasTollAlerts = !hasLiveTolls && tolls <= 0 && itinerary.tollNotices.length > 0
  const tollRoute = (itinerary.tollCountries ?? []).join(" → ")
  const estimateKey = isEv ? "fuelEstimateEnergy" : "fuelEstimateFuel"

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
          value={hasTollAlerts ? t("seeAlerts") : tolls > 0 ? formatEur(tolls, locale) : formatEur(0, locale)}
          badge={hasTollAlerts}
        />
        <Stat icon={<Receipt className="size-4" />} label={t("costTotal")} value={totalLabel} highlight />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t(estimateKey, { consumption, unit: energyUnit, price: formatEur(fuelPrice, locale) })}
      </p>
      {hasLiveTolls && !itinerary.tollAvoided && itinerary.tollSource ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {tollRoute
            ? t("tollEstimateLive", {
                route: tollRoute,
                price: formatEur(tolls, locale),
                source: itinerary.tollSource,
              })
            : t("tollEstimateLiveNoRoute", { price: formatEur(tolls, locale), source: itinerary.tollSource })}
        </p>
      ) : null}
      {itinerary.tollAvoided ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("tollAvoided")}</p>
      ) : null}
      {itinerary.vehicle.fuelPriceCustom ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("fuelPriceCustom", {
            price: formatEur(fuelPrice, locale),
            unit: energyUnit,
          })}
        </p>
      ) : itinerary.vehicle.fuelCountryCode && itinerary.vehicle.fuelPriceSource && !itinerary.vehicle.fuelPriceFallback ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("fuelPriceLive", {
            country: itinerary.vehicle.fuelCountryCode,
            price: formatEur(fuelPrice, locale),
            unit: energyUnit,
            source: itinerary.vehicle.fuelPriceSource,
          })}
        </p>
      ) : null}

      {itinerary.tollBreakdown && itinerary.tollBreakdown.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("tollBreakdownTitle")}
          </span>
          {itinerary.tollBreakdown.map((line, i) => (
            <div
              key={`${line.country}-${line.label}-${i}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0 flex-1 text-xs leading-relaxed text-foreground">
                {line.kind === "perKm"
                  ? t("tollBreakdownPerKm", { country: line.country, km: line.km ?? 0 })
                  : `${line.label} · ${line.country}`}
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                {formatEur(line.amountEur, locale)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

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
  badge,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
  badge?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-brand/30 bg-brand/10 p-4 text-brand"
          : "rounded-xl border border-slate-200 bg-white p-4 text-slate-900"
      }
    >
      <div className={`flex items-center gap-1.5 text-xs ${highlight ? "text-brand/80" : "text-slate-500"}`}>
        {icon}
        {label}
      </div>
      <div className={badge ? "mt-1" : "mt-1 font-display text-lg font-bold tabular-nums"}>
        {badge ? <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">{value}</span> : value}
      </div>
    </div>
  )
}
