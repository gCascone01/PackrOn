const BOOKING_AID = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_ID || "YOUR_ID"

export function bookingSearchUrl(query: string): string {
  const params = new URLSearchParams({
    ss: query,
    aid: BOOKING_AID,
  })
  return `https://www.booking.com/searchresults.html?${params.toString()}`
}

export function getYourGuideSearchUrl(query: string): string {
  const params = new URLSearchParams({ q: query })
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
