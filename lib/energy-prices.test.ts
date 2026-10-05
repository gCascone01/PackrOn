import { afterEach, describe, expect, it, vi } from "vitest"
import {
  clearEnergyPriceCache,
  fuelGradeChain,
  getElectricityPriceEurPerKwh,
  getEnergyPrice,
  getFuelPriceEurPerLitre,
  latestSeriesValue,
  pickGradePrice,
  toEur,
  toLitres,
} from "./energy-prices"

afterEach(() => {
  clearEnergyPriceCache()
  vi.unstubAllGlobals()
})

describe("energy-prices pure helpers", () => {
  it("picks gasoline grades for benzina/moto and diesel for diesel/camper", () => {
    expect(fuelGradeChain("benzina")).toContain("gasoline")
    expect(fuelGradeChain("moto")).toContain("gasoline")
    expect(fuelGradeChain("diesel")[0]).toBe("diesel")
    expect(fuelGradeChain("camper")[0]).toBe("diesel")
  })

  it("picks the first available grade, skipping nulls", () => {
    expect(pickGradePrice({ gasoline: null, gasoline_premium: 2.25 }, ["gasoline", "gasoline_premium"])).toBe(2.25)
    expect(pickGradePrice({ diesel: 1.7 }, ["diesel"])).toBe(1.7)
    expect(pickGradePrice({}, ["diesel"])).toBeNull()
    expect(pickGradePrice(null, ["diesel"])).toBeNull()
  })

  it("converts gallons to litres", () => {
    expect(toLitres(4.4398, "gallon")).toBeCloseTo(4.4398 / 3.78541, 5)
    expect(toLitres(17, "imperial_gallon")).toBeCloseTo(17 / 4.54609, 5)
    expect(toLitres(1.8, "liter")).toBe(1.8)
  })

  it("converts foreign currency to EUR via rates", () => {
    expect(toEur(4.4398, "EUR", {})).toBe(4.4398)
    expect(toEur(112.58, "USD", { USD: 1.1258 })).toBeCloseTo(100, 5)
    expect(toEur(10, "XXX", {})).toBeNull()
  })

  it("takes the latest non-null series observation", () => {
    expect(latestSeriesValue(["2024-S1", "2024-S2"], [0.3, null])).toBe(0.3)
    expect(latestSeriesValue(["2024-S1", "2024-S2"], [0.3, 0.32])).toBe(0.32)
    expect(latestSeriesValue([], [])).toBeNull()
  })
})

function mockFetch(handler: (url: string) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = handler(url)
      if (body == null) return { ok: false, json: async () => null }
      return { ok: true, json: async () => body }
    }),
  )
}

describe("getFuelPriceEurPerLitre", () => {
  it("returns the EUR/litre gasoline price for IT", async () => {
    mockFetch((url) =>
      url.includes("/fuel/prices")
        ? {
            data: {
              IT: {
                prices: { gasoline: 2.1071, diesel: 2.3038 },
                currency: "EUR",
                unit: "liter",
                sources: ["EU Weekly Oil Bulletin"],
              },
            },
          }
        : { rates: { EUR: 1 } },
    )
    const res = await getFuelPriceEurPerLitre("IT", "benzina")
    expect(res?.priceEur).toBeCloseTo(2.1071, 4)
    expect(res?.source).toMatch(/OpenVan/)
  })

  it("converts US gallons+USD to EUR/litre", async () => {
    mockFetch((url) =>
      url.includes("/fuel/prices")
        ? {
            data: {
              US: { prices: { gasoline: 4.4398 }, currency: "USD", unit: "gallon", sources: ["EIA"] },
            },
          }
        : { rates: { USD: 1.1258 } },
    )
    const res = await getFuelPriceEurPerLitre("US", "benzina")
    expect(res?.priceEur).toBeCloseTo(4.4398 / 3.78541 / 1.1258, 4)
  })

  it("returns null when the country is unknown", async () => {
    mockFetch(() => ({ data: {} }))
    expect(await getFuelPriceEurPerLitre("XX", "diesel")).toBeNull()
  })
})

describe("getElectricityPriceEurPerKwh", () => {
  it("returns the latest Eurostat household price", async () => {
    mockFetch(() => ({
      series: { docs: [{ period: ["2024-S1", "2024-S2"], value: [0.3274, 0.3111] }] },
    }))
    const res = await getElectricityPriceEurPerKwh("IT")
    expect(res?.priceEur).toBeCloseTo(0.3111, 4)
  })

  it("returns null outside Eurostat coverage", async () => {
    mockFetch(() => null)
    expect(await getElectricityPriceEurPerKwh("US")).toBeNull()
  })
})

describe("getEnergyPrice", () => {
  it("never throws and falls back without a country", async () => {
    mockFetch(() => null)
    const res = await getEnergyPrice(null, "diesel")
    expect(res.fallback).toBe(true)
    expect(res.priceEur).toBeGreaterThan(0)
    expect(res.unit).toBe("L")
  })

  it("routes EVs to the kWh electricity path", async () => {
    mockFetch((url) =>
      url.includes("db.nomics") ? { series: { docs: [{ period: ["2025-S1"], value: [0.3835] }] } } : null,
    )
    const res = await getEnergyPrice("DE", "elettrica")
    expect(res.fallback).toBe(false)
    expect(res.unit).toBe("kWh")
    expect(res.priceEur).toBeCloseTo(0.3835, 4)
  })
})
