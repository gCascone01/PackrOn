import type { Stop } from "./types"

/** Universal deep links that open the native navigator on a smartphone. */
export function googleMapsUrl(stop: Stop): string {
  return `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`
}

export function wazeUrl(stop: Stop): string {
  return `https://waze.com/ul?ll=${stop.lat},${stop.lng}&navigate=yes`
}

export function appleMapsUrl(stop: Stop): string {
  return `https://maps.apple.com/?daddr=${stop.lat},${stop.lng}&dirflg=d`
}
