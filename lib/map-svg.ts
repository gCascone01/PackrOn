export function normalizeCoordinates(points: { lat: number; lng: number }[], width = 400, height = 300, padding = 40) {
  if (!points || points.length === 0) return []
  
  const minLat = Math.min(...points.map((p) => p.lat))
  const maxLat = Math.max(...points.map((p) => p.lat))
  const minLng = Math.min(...points.map((p) => p.lng))
  const maxLng = Math.max(...points.map((p) => p.lng))

  const latDiff = maxLat - minLat || 1
  const lngDiff = maxLng - minLng || 1

  // preserve aspect ratio
  const scale = Math.min((width - padding * 2) / lngDiff, (height - padding * 2) / latDiff)

  const cx = (minLng + maxLng) / 2
  const cy = (minLat + maxLat) / 2

  return points.map((p) => {
    // lng -> X, lat -> Y (inverted)
    const x = width / 2 + (p.lng - cx) * scale
    const y = height / 2 - (p.lat - cy) * scale
    return { x, y }
  })
}
