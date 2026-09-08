import type { Locale } from "./i18n"

function geoErrorCode(error: unknown): number | null {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "number") {
    return error.code
  }
  return null
}

export type LocateCityError = "unsupported" | "denied" | "unavailable" | "failed"

export async function resolveCurrentCity(locale: Locale): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("unsupported" satisfies LocateCityError)
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60_000,
    })
  }).catch((error: unknown) => {
    const code = geoErrorCode(error)
    if (code === 1) throw new Error("denied" satisfies LocateCityError)
    throw new Error("unavailable" satisfies LocateCityError)
  })

  const lat = position.coords.latitude
  const lng = position.coords.longitude
  const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}&locale=${locale}`)
  const data = (await res.json()) as { city?: string }
  if (!res.ok || !data.city) {
    throw new Error("failed" satisfies LocateCityError)
  }
  return data.city
}

export function locateCityMessageKey(error: unknown): "geoUnsupported" | "geoDenied" | "geoUnavailable" | "geoFailed" {
  const message = error instanceof Error ? error.message : ""
  if (message === "unsupported") return "geoUnsupported"
  if (message === "denied") return "geoDenied"
  if (message === "unavailable") return "geoUnavailable"
  return "geoFailed"
}
