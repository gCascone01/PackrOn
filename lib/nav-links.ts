import type { Stop } from "./types"

function placeQuery(stop: Stop): string {
  return stop.name.trim() || `${stop.lat},${stop.lng}`
}

/** Universal deep links that open the native navigator on a smartphone. */
export function googleMapsUrl(stop: Stop): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(placeQuery(stop))}&center=${stop.lat},${stop.lng}&zoom=17`
}

export function wazeUrl(stop: Stop): string {
  return `https://www.waze.com/ul?q=${encodeURIComponent(placeQuery(stop))}&ll=${stop.lat},${stop.lng}&navigate=yes`
}

export function appleMapsUrl(stop: Stop): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(placeQuery(stop))}&ll=${stop.lat},${stop.lng}&dirflg=d`
}
