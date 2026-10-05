import { afterEach, describe, expect, it, vi } from "vitest"
import { clearTollCache, getRouteTolls, parseRouteTolls, vehicleClassForTolls } from "./tolls"

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

describe("parseRouteTolls", () => {
  it("extracts the total and countries", () => {
    expect(
      parseRouteTolls({ total_eur: 172.21, route_countries: ["IT", "FR"], partial: false }),
    ).toEqual({ totalEur: 172.21, countries: ["IT", "FR"], source: "OpenVan" })
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

describe("getRouteTolls", () => {
  it("returns the estimate and caches it", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ total_eur: 48.81, route_countries: ["IT"], partial: false }),
    }))
    vi.stubGlobal("fetch", fetchMock)
    const first = await getRouteTolls("Rome", "Milan", "car")
    expect(first?.totalEur).toBeCloseTo(48.81, 2)
    const second = await getRouteTolls("Rome", "Milan", "car")
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const firstUrl = String((fetchMock.mock.calls[0] as unknown[])[0])
    expect(firstUrl).toMatch(/vehicle_class=car/)
  })

  it("never throws: network failure resolves to null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline")
      }),
    )
    await expect(getRouteTolls("Rome", "Paris", "car")).resolves.toBeNull()
  })

  it("rejects blank waypoints without fetching", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await expect(getRouteTolls("", "Paris", "car")).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
