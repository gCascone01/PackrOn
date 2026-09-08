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

export function googleMapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}
