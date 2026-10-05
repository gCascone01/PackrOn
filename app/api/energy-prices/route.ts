import { NextResponse } from "next/server"
import { getEnergyPrice } from "@/lib/energy-prices"
import { geocodeLocation } from "@/lib/geocode"

/**
 * Live country-dependent energy price for the trip cost estimate.
 * GET /api/energy-prices?vehicle=diesel&country=IT
 * GET /api/energy-prices?vehicle=benzina&origin=Milano,%20Italia
 * Never errors with 500: unknown countries fall back to built-in defaults.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const vehicle = searchParams.get("vehicle") ?? "diesel"
  let country = (searchParams.get("country") ?? "").trim().toUpperCase()
  const origin = (searchParams.get("origin") ?? "").trim()

  if (!/^[A-Z]{2}$/.test(country) && origin) {
    try {
      const geo = await geocodeLocation(origin)
      if (geo?.countryCode) country = geo.countryCode
    } catch {
      // fall through to fallback price below
    }
  }

  const price = await getEnergyPrice(/^[A-Z]{2}$/.test(country) ? country : null, vehicle)
  return NextResponse.json({
    priceEur: price.priceEur,
    unit: price.unit,
    countryCode: price.countryCode,
    source: price.source,
    fallback: price.fallback,
  })
}
