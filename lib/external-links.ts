import type { Stop } from "./types"

const BOOKING_AID = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_ID
const GETYOURGUIDE_PARTNER = process.env.NEXT_PUBLIC_GETYOURGUIDE_PARTNER_ID

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

export function bookingSearchUrl(query: string): string {
  const params = new URLSearchParams({ ss: query })
  if (BOOKING_AID && BOOKING_AID !== "YOUR_ID") {
    params.set("aid", BOOKING_AID)
  }
  return `https://www.booking.com/searchresults.html?${params.toString()}`
}

export function getYourGuideSearchUrl(query: string): string {
  const params = new URLSearchParams({ q: query })
  if (GETYOURGUIDE_PARTNER) {
    params.set("partner_id", GETYOURGUIDE_PARTNER)
  }
  return `https://www.getyourguide.com/s/?${params.toString()}`
}

export function googleMapsSearchUrl(place: string, lat?: number, lng?: number): string {
  const query = place?.trim() || (Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : "")
  if (!query) {
    return "https://www.google.com/maps"
  }

  const center = Number.isFinite(lat) && Number.isFinite(lng) ? `&center=${lat},${lng}&zoom=17` : ""
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}${center}`
}
