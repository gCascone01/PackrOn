import { afterEach, describe, expect, it, vi } from "vitest"
import { buildTollWaypoints, clearTollCache, getRouteTolls, parseRouteTolls, parseTollLines, sanitizeWaypoints, vehicleClassForTolls } from "./tolls"

afterEach(() => {
  clearTollCache()
  vi.unstubAllGlobals()
})

describe("vehicleClassForTolls", () => {
  it("maps campervans to van, everything else to car", () => {
    expect(vehicleClassForTolls("camper")).toBe("van")
    expect(vehicleClassForTolls("benzina")).toBe("car")
    expect(vehicleClassForTolls("diesel")).toBe("car")
    expect(vehicleClassForTolls("moto")).toBe("car")
    expect(vehicleClassForTolls("elettrica")).toBe("car")
  })
})

describe("parseTollLines", () => {
  const romeParis = {
    total_eur: 172.21,
    route_countries: ["IT", "FR"],
    partial: false,
    items: [
      { type: "object", country: "FR", amount_eur: 55.5, meta: { name: "Mont Blanc Tunnel", kind: "tunnel" } },
      { type: "per_km", country: "IT", amount_eur: 48.81, meta: { km: 542.3 } },
      { type: "per_km", country: "IT", amount_eur: 10.93, meta: { km: 121.4 } },
      { type: "per_km", country: "FR", amount_eur: 31.12, meta: { km: 327.5 } },
    ],
  }

  it("aggregates per-km sections by country and keeps charges separate", () => {
    expect(parseTollLines(romeParis)).toEqual([
      { kind: "perKm", country: "IT", label: "IT", km: 664, amountEur: 59.74 },
      { kind: "perKm", country: "FR", label: "FR", km: 328, amountEur: 31.12 },
      { kind: "charge", country: "FR", label: "Mont Blanc Tunnel", km: null, amountEur: 55.5 },
    ])
  })

  it("labels vignettes with their validity", () => {
    expect(
      parseTollLines({ items: [{ type: "vignette", country: "AT", amount_eur: 12.8, meta: { period: "10d", valid_days: 10 } }] }),
    ).toEqual([{ kind: "charge", country: "AT", label: "Vignette · 10-day", km: null, amountEur: 12.8 }])
  })

  it("skips zero, negative, absurd, and malformed items", () => {
    expect(
      parseTollLines({
        items: [
          { type: "per_km", country: "IT", amount_eur: 0, meta: { km: 10 } },
          { type: "object", country: "FR", amount_eur: -3, meta: { name: "X" } },
          { type: "object", country: "FR", amount_eur: 9999, meta: { name: "Y" } },
          { type: "object", country: "", amount_eur: 5, meta: { name: "Z" } },
          null,
          "garbage",
        ],
      }),
    ).toEqual([])
    expect(parseTollLines({})).toEqual([])
    expect(parseTollLines(null)).toEqual([])
  })

  it("caps the line count on noisy routes", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      type: "object",
      country: "IT",
      amount_eur: i + 1,
      meta: { name: `Gate ${i}` },
    }))
    expect(parseTollLines({ items })).toHaveLength(10)
  })
})

describe("parseRouteTolls", () => {
  it("extracts the total and countries", () => {
    expect(
      parseRouteTolls({ total_eur: 172.21, route_countries: ["IT", "FR"], partial: false }),
    ).toEqual({ totalEur: 172.21, countries: ["IT", "FR"], source: "OpenVan", lines: [] })
  })

  it("flags partial coverage from the partial flag or unknown countries", () => {
    expect(parseRouteTolls({ total_eur: 10, route_countries: ["IT"], partial: true })?.source).toMatch(/partial/)
    expect(
      parseRouteTolls({ total_eur: 10, route_countries: ["IT"], unknown_countries: ["XX"] })?.source,
    ).toMatch(/partial/)
  })

  it("accepts a zero total (toll-free route)", () => {
    expect(parseRouteTolls({ total_eur: 0, route_countries: ["DE"] })?.totalEur).toBe(0)
  })

  it("rejects garbage, negatives, and absurd totals", () => {
    expect(parseRouteTolls(null)).toBeNull()
    expect(parseRouteTolls({})).toBeNull()
    expect(parseRouteTolls({ total_eur: -5 })).toBeNull()
    expect(parseRouteTolls({ total_eur: 99999 })).toBeNull()
    expect(parseRouteTolls({ total_eur: "172" })).toBeNull()
  })

  it("drops malformed country codes", () => {
    expect(
      parseRouteTolls({ total_eur: 5, route_countries: ["IT", "Italy", 42] })?.countries,
    ).toEqual(["IT"])
  })
})

describe("sanitizeWaypoints", () => {
  it("trims, drops blanks, dedupes repeats, and caps at 10", () => {
    expect(sanitizeWaypoints([" Rome ", "", "Rome", "Milan", null, undefined, "x"])).toEqual([
      "Rome",
      "Milan",
    ])
    const many = Array.from({ length: 15 }, (_, i) => `City${i}`)
    expect(sanitizeWaypoints(many)).toHaveLength(10)
  })
})

describe("buildTollWaypoints", () => {
  const MILAN = { lat: 45.46427, lng: 9.18951 }
  const VENICE = { lat: 45.44085, lng: 12.31552 }
  const ROME = { lat: 41.89193, lng: 12.51133 }

  it("builds an origin + day-end coordinate skeleton", () => {
    expect(
      buildTollWaypoints({
        origin: MILAN,
        days: [
          { stops: [{ ...VENICE }, { lat: null, lng: null }] },
          { stops: [{ ...ROME }] },
        ],
        loop: false,
      }),
    ).toEqual(["45.46427,9.18951", "45.44085,12.31552", "41.89193,12.51133"])
  })

  it("skips null-coord drive stops and appends origin for loops", () => {
    const points = buildTollWaypoints({
      origin: MILAN,
      days: [{ stops: [{ lat: null, lng: null }, { ...VENICE }] }],
      loop: true,
    })
    expect(points[0]).toBe("45.46427,9.18951")
    expect(points[points.length - 1]).toBe("45.46427,9.18951")
    expect(points).toHaveLength(3)
  })

  it("downsamples long trips to the 10-waypoint cap", () => {
    const days = Array.from({ length: 20 }, (_, i) => ({
      stops: [{ lat: 40 + i, lng: 10 }],
    }))
    const points = buildTollWaypoints({ origin: MILAN, days, loop: true })
    expect(points.length).toBeLessThanOrEqual(10)
    expect(points[0]).toBe("45.46427,9.18951")
    expect(points[points.length - 1]).toBe("45.46427,9.18951")
  })

  it("falls back to origin/destination names without coordinates", () => {
    expect(
      buildTollWaypoints({ origin: null, originName: "Milan", destinationName: "Rome", days: [], loop: false }),
    ).toEqual(["Milan", "Rome"])
    expect(
      buildTollWaypoints({ origin: null, days: [], loop: false }),
    ).toEqual([])
  })
})

describe("getRouteTolls", () => {
  it("returns the estimate and caches it", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ total_eur: 48.81, route_countries: ["IT"], partial: false }),
    }))
    vi.stubGlobal("fetch", fetchMock)
    const first = await getRouteTolls(["Rome", "Florence", "Milan"], "car")
    expect(first?.totalEur).toBeCloseTo(48.81, 2)
    const second = await getRouteTolls(["Rome", "Florence", "Milan"], "car")
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const firstUrl = String((fetchMock.mock.calls[0] as unknown[])[0])
    expect(firstUrl).toMatch(/vehicle_class=car/)
    expect(firstUrl).toMatch(/Florence/)
  })

  it("never throws: network failure resolves to null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline")
      }),
    )
    await expect(getRouteTolls(["Rome", "Paris"], "car")).resolves.toBeNull()
  })

  it("needs at least two usable waypoints, without fetching", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await expect(getRouteTolls(["", "Paris"], "car")).resolves.toBeNull()
    await expect(getRouteTolls(["Rome"], "car")).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
