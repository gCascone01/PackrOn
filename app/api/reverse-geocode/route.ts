import { NextResponse } from "next/server"

type NominatimAddress = {
  city?: string
  town?: string
  village?: string
  municipality?: string
  city_district?: string
  county?: string
  state?: string
  country?: string
}

type NominatimReverse = {
  address?: NominatimAddress
  name?: string
}

function cityFromAddress(address: NominatimAddress | undefined, name?: string): string | null {
  if (!address) return name?.trim() || null
  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.city_district ||
    address.county ||
    name
  if (!locality) return null
  return address.country ? `${locality}, ${address.country}` : locality
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const locale = searchParams.get("locale") === "en" ? "en" : "it"

  const latNum = Number(lat)
  const lngNum = Number(lng)
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 })
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("lat", String(latNum))
  url.searchParams.set("lon", String(lngNum))
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("zoom", "10")
  url.searchParams.set("accept-language", locale)

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PackrOn/1.0 (travel planner; reverse geocode)",
    },
    cache: "no-store",
  })

  if (res.ok) {
    const data = (await res.json()) as NominatimReverse
    const city = cityFromAddress(data.address, data.name)
    if (city) return NextResponse.json({ city })
  }

  const fallback = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client")
  fallback.searchParams.set("latitude", String(latNum))
  fallback.searchParams.set("longitude", String(lngNum))
  fallback.searchParams.set("localityLanguage", locale)
  const fallbackRes = await fetch(fallback, { cache: "no-store" })
  if (fallbackRes.ok) {
    const data = (await fallbackRes.json()) as {
      city?: string
      locality?: string
      countryName?: string
    }
    const locality = data.city || data.locality
    if (locality) {
      const city = data.countryName ? `${locality}, ${data.countryName}` : locality
      return NextResponse.json({ city })
    }
  }

  return NextResponse.json({ error: "City not found" }, { status: 404 })
}
