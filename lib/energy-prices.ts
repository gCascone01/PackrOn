import type { VehicleType } from "./types"

/**
 * Country-dependent live energy prices (fuel + household electricity).
 *
 * - Motor fuel: OpenVan.camp public API (no key, CC BY 4.0), weekly retail
 *   averages from 45+ official sources (EU Weekly Oil Bulletin, EIA, ...).
 *   `GET https://openvan.camp/api/fuel/prices?country={ISO2}` returns
 *   per-grade prices in local currency/unit plus a currency-rates endpoint
 *   for EUR conversion and gallon->litre handling (US, etc.).
 * - Household electricity: Eurostat `nrg_pc_204` (band DC 2500-4999 kWh,
 *   all taxes included, EUR/kWh) via the DBnomics mirror API (no key).
 *   Covers ~35 European countries; outside that we fall back to defaults.
 *
 * Every exported fetch never throws: network/timeout/parse failures resolve
 * to `null` (or a `fallback: true` default price), so trip generation and
 * cost display always work offline.
 */

export interface EnergyPrice {
  /** Price in EUR per unit (litre for fuel, kWh for electricity). */
  priceEur: number
  unit: "L" | "kWh"
  countryCode: string | null
  /** Human-readable provenance for the UI (e.g. "OpenVan · EU Oil Bulletin"). */
  source: string
  /** True when this is the built-in fallback, not a live API value. */
  fallback: boolean
}

export const FALLBACK_ENERGY_PRICE: Record<VehicleType, number> = {
  benzina: 1.8,
  diesel: 1.72,
  elettrica: 0.4,
  camper: 1.85,
  moto: 1.8,
}

const FUEL_API = "https://openvan.camp/api/fuel/prices"
const RATES_API = "https://openvan.camp/api/currency/rates"
const DBNOMICS_SERIES = (cc: string) =>
  `https://api.db.nomics.world/v22/series/Eurostat/nrg_pc_204/S.6000.KWH2500-4999.KWH.I_TAX.EUR.${cc}?observations=1`

const GALLON_L = 3.78541
const IMPERIAL_GALLON_L = 4.54609
const FETCH_TIMEOUT_MS = 6000

type CacheEntry<T> = { expires: number; value: T }
const cache = new Map<string, CacheEntry<unknown>>()

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry || entry.expires <= Date.now()) {
    if (entry) cache.delete(key)
    return null
  }
  return entry.value
}

function cacheSet<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { expires: Date.now() + ttlMs, value })
}

/** Test hook: clear in-memory caches. */
export function clearEnergyPriceCache() {
  cache.clear()
}

const GASOLINE_CHAIN = ["gasoline", "gasoline_regular", "gasoline_premium", "gasoline_super", "premium"] as const
const DIESEL_CHAIN = ["diesel", "diesel_regular", "diesel_premium"] as const

/** Grade preference per vehicle; EV is handled by the electricity path. */
export function fuelGradeChain(vehicle: string): readonly string[] {
  switch (vehicle) {
    case "diesel":
    case "camper":
      return DIESEL_CHAIN
    default:
      return GASOLINE_CHAIN
  }
}

/** First non-null finite price in the grade preference chain. */
export function pickGradePrice(
  prices: Record<string, number | null> | undefined | null,
  chain: readonly string[],
): number | null {
  if (!prices) return null
  for (const grade of chain) {
    const v = prices[grade]
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v
  }
  return null
}

/** Normalize any published unit to litres. Unknown units pass through. */
export function toLitres(price: number, unit: string | undefined | null): number {
  const u = (unit ?? "liter").toLowerCase()
  if (u === "gallon") return price / GALLON_L
  if (u === "imperial_gallon" || u === "imperial gallon" || u === "imperial-gallon") return price / IMPERIAL_GALLON_L
  return price
}

/** Convert a price in `currency` to EUR via OpenVan rates (base EUR). */
export function toEur(price: number, currency: string | undefined | null, rates: Record<string, number>): number | null {
  const cur = (currency ?? "EUR").toUpperCase()
  if (cur === "EUR") return price
  const rate = rates[cur]
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null
  return price / rate
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as unknown
  } catch {
    return null
  }
}

type OpenVanFuelResponse = {
  success?: boolean
  data?: Record<
    string,
    {
      prices?: Record<string, number | null>
      currency?: string
      currencies?: Record<string, string>
      unit?: string
      units?: Record<string, string>
      sources?: string[]
    }
  >
}

type OpenVanRatesResponse = {
  rates?: Record<string, number>
}

async function getRates(): Promise<Record<string, number>> {
  const cached = cacheGet<Record<string, number>>("rates")
  if (cached) return cached
  const json = (await fetchJson(RATES_API)) as OpenVanRatesResponse | null
  const rates = json?.rates && typeof json.rates === "object" ? json.rates : null
  if (rates) cacheSet("rates", rates, 24 * 3600 * 1000)
  return rates ?? {}
}

/**
 * Live retail motor-fuel price for a country (EUR/litre).
 * Returns null when the API has no usable value (caller falls back).
 */
export async function getFuelPriceEurPerLitre(
  countryCode: string,
  vehicle: string,
): Promise<{ priceEur: number; source: string } | null> {
  const cc = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return null
  const cacheKey = `fuel:${cc}:${fuelGradeChain(vehicle).join("+")}`
  const cached = cacheGet<{ priceEur: number; source: string }>(cacheKey)
  if (cached) return cached

  const json = (await fetchJson(`${FUEL_API}?country=${cc}&source=packron.app`)) as OpenVanFuelResponse | null
  const entry = json?.data?.[cc]
  if (!entry) return null

  const raw = pickGradePrice(entry.prices, fuelGradeChain(vehicle))
  if (raw == null) return null

  // The grade that actually matched decides per-grade currency/unit when present.
  const chain = fuelGradeChain(vehicle)
  const matchedGrade = chain.find(
    (g) => typeof entry.prices?.[g] === "number" && (entry.prices[g] as number) > 0,
  )
  const currency = (matchedGrade && entry.currencies?.[matchedGrade]) || entry.currency || "EUR"
  const unit = (matchedGrade && entry.units?.[matchedGrade]) || entry.unit || "liter"

  const perLitre = toLitres(raw, unit)
  const rates = await getRates()
  const priceEur = toEur(perLitre, currency, rates)
  if (priceEur == null || !Number.isFinite(priceEur) || priceEur <= 0 || priceEur > 10) return null

  const source = entry.sources?.length
    ? `OpenVan · ${entry.sources.slice(0, 2).join(", ")}`
    : "OpenVan.camp"
  const result = { priceEur, source }
  cacheSet(cacheKey, result, 6 * 3600 * 1000)
  return result
}

type DbNomicsResponse = {
  series?: {
    docs?: Array<{
      period?: string[]
      value?: Array<number | null>
    }>
  }
}

/** Latest non-null observation of a DBnomics series doc. */
export function latestSeriesValue(period: readonly (string | undefined)[] | undefined, values: readonly (number | null | undefined)[] | undefined): number | null {
  if (!values || values.length === 0) return null
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i]
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v
  }
  return period ? null : null
}

/**
 * Live household electricity price for a European country (EUR/kWh,
 * Eurostat band DC all taxes included). Returns null outside coverage.
 */
export async function getElectricityPriceEurPerKwh(
  countryCode: string,
): Promise<{ priceEur: number; source: string } | null> {
  const cc = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return null
  const cached = cacheGet<{ priceEur: number; source: string }>(`power:${cc}`)
  if (cached) return cached

  const json = (await fetchJson(DBNOMICS_SERIES(cc))) as DbNomicsResponse | null
  const doc = json?.series?.docs?.[0]
  const value = latestSeriesValue(doc?.period, doc?.value)
  if (value == null || value <= 0 || value > 2) return null

  const result = { priceEur: value, source: "Eurostat nrg_pc_204 · DBnomics" }
  cacheSet(`power:${cc}`, result, 7 * 24 * 3600 * 1000)
  return result
}

/**
 * Country-dependent unit price for the given vehicle. Never throws:
 * on any failure returns the built-in fallback with `fallback: true`.
 */
export async function getEnergyPrice(countryCode: string | null | undefined, vehicle: string): Promise<EnergyPrice> {
  const fallbackFor = (): EnergyPrice => ({
    priceEur: FALLBACK_ENERGY_PRICE[(vehicle as VehicleType) ?? "diesel"] ?? 1.8,
    unit: vehicle === "elettrica" ? "kWh" : "L",
    countryCode: countryCode?.toUpperCase() ?? null,
    source: "PackrOn estimate",
    fallback: true,
  })

  const cc = (countryCode ?? "").trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return fallbackFor()
  try {
    if (vehicle === "elettrica") {
      const live = await getElectricityPriceEurPerKwh(cc)
      if (live) return { ...live, unit: "kWh", countryCode: cc, fallback: false }
      return fallbackFor()
    }
    const live = await getFuelPriceEurPerLitre(cc, vehicle)
    if (live) return { ...live, unit: "L", countryCode: cc, fallback: false }
    return fallbackFor()
  } catch {
    return fallbackFor()
  }
}
