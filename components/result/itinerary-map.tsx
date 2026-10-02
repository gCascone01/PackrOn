"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState } from "react"
import type { Map as LeafletMap, LayerGroup } from "leaflet"
import type { Stop, TripMode } from "@/lib/types"

export interface MapStop extends Stop {
  seq: number
  dayNumber: number
}

export interface OriginPoint {
  lat: number
  lng: number
  name: string
}

export function ItineraryMap({
  stops,
  selectedId,
  onSelect,
  mode = "city",
  origin,
  zoomControl = true,
  attributionControl = true,
  interactive = true,
  heroMap = false,
  loop = false,
}: {
  stops: MapStop[]
  selectedId: string | null
  onSelect: (id: string) => void
  mode?: TripMode
  origin?: OriginPoint
  zoomControl?: boolean
  attributionControl?: boolean
  interactive?: boolean
  heroMap?: boolean
  loop?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  const [routeGeometries, setRouteGeometries] = useState<[number, number][] | null>(null)

  // Fetch real routes from OSRM
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    async function fetchRealRoute() {
      const validStops = stops.filter(
        (s): s is MapStop & { lat: number; lng: number } =>
          typeof s.lat === "number" && typeof s.lng === "number" && Number.isFinite(s.lat) && Number.isFinite(s.lng),
      )
      if (validStops.length === 0) {
        if (!cancelled) setRouteGeometries(null)
        return
      }

      const points = []
      if (origin && typeof origin.lat === "number" && typeof origin.lng === "number" && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
        points.push({ lat: origin.lat, lng: origin.lng })
      }
      points.push(...validStops)

      if (points.length < 2) {
        if (!cancelled) setRouteGeometries(null)
        return
      }

      const profile = mode === "road" ? "driving" : "foot"
      const coordinateString = points.map((p) => `${p.lng},${p.lat}`).join(";")
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinateString}?overview=full&geometries=geojson`

      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`OSRM API error: ${response.status}`)
        }
        const data = await response.json()
        if (data.code !== "Ok") {
          throw new Error(`OSRM API not OK: ${data.code}`)
        }
        
        if (data.routes && data.routes.length > 0) {
          const geojson = data.routes[0].geometry
          if (geojson && geojson.type === "LineString" && geojson.coordinates) {
            const coords: [number, number][] = geojson.coordinates.map((c: [number, number]) => [c[1], c[0]])
            if (!cancelled) setRouteGeometries(coords)
          } else {
            if (!cancelled) setRouteGeometries(null)
          }
        } else {
          if (!cancelled) setRouteGeometries(null)
        }
      } catch (error) {
        console.warn("Failed to fetch real route from OSRM, falling back to straight lines.", error)
        if (!cancelled) setRouteGeometries(null)
      } finally {
        clearTimeout(timeoutId)
      }
    }

    fetchRealRoute()

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [stops, mode, origin])

  // Init map once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current || mapRef.current) return
      leafletRef.current = L
      const map = L.map(containerRef.current, {
        zoomControl: false,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        attributionControl,
      }).setView(mode === "city" ? [37.39, -5.99] : [48.2, 16.37], mode === "city" ? 13 : 7)
      if (zoomControl) L.control.zoom({ position: "bottomright" }).addTo(map)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      renderLayers()
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-render markers + polyline when data changes
  useEffect(() => {
    renderLayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, selectedId, routeGeometries])

  function renderLayers() {
    const L = leafletRef.current
    const map = mapRef.current
    const layer = layerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()
    if (!stops || stops.length === 0) return

    // Filtra solo le tappe con coordinate valide per evitare crash (NaN)
    const validStops = stops.filter(
      (s): s is MapStop & { lat: number; lng: number } =>
        typeof s.lat === "number" && typeof s.lng === "number" && Number.isFinite(s.lat) && Number.isFinite(s.lng),
    )
    if (validStops.length === 0) return

    const latlngs = validStops.map((s) => [s.lat, s.lng] as [number, number])
    const boundsLatLngs = [...latlngs]

    if (origin && typeof origin.lat === "number" && typeof origin.lng === "number" && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
      boundsLatLngs.push([origin.lat, origin.lng] as [number, number])
    }

    const polylineStyles = {
      color: "oklch(0.55 0.216 264)",
      weight: mode === "road" ? 4 : 3,
      opacity: mode === "road" ? 0.9 : 0.75,
      dashArray: mode === "road" ? undefined : "1 8",
      lineCap: "round" as const,
    }

    if (routeGeometries) {
      L.polyline(routeGeometries, polylineStyles).addTo(layer)
    }

    const homeIcon = L.divIcon({
      className: "packron-marker",
      html: `<div class="packron-marker-pin" style="background:oklch(0.55 0.216 264);transform:rotate(-45deg);"><span class="text-xs font-bold">🏠</span></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    })

    // Add origin point and line from origin to first stop
    if (origin && typeof origin.lat === "number" && typeof origin.lng === "number" && !isNaN(origin.lat) && !isNaN(origin.lng)) {
      const originLatLng: [number, number] = [origin.lat, origin.lng]
      
      if (!routeGeometries) {
        // Draw line from origin to first stop
        L.polyline([originLatLng, latlngs[0]], polylineStyles).addTo(layer)
      }

      const originMarker = L.marker(originLatLng, { icon: homeIcon, interactive: interactive && !heroMap }).addTo(layer)
      if (!heroMap) originMarker.bindTooltip(`${origin.name || "Start"}`, { direction: "top", offset: [0, -28] })
    }

    if (!routeGeometries) {
      L.polyline(latlngs, polylineStyles).addTo(layer)
    }

    validStops.forEach((s, index) => {
      const active = s.id === selectedId
      const isDestination = heroMap && !loop && index === validStops.length - 1
      const icon = heroMap && !isDestination
        ? L.divIcon({
            className: "",
            html: '<div class="h-3 w-3 rounded-full border-2 border-blue-600 bg-white shadow-sm"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          })
        : heroMap && isDestination
          ? L.divIcon({
              className: "",
              html: '<div class="flex h-8 w-8 -rotate-45 items-center justify-center rounded-full rounded-br-none border-2 border-white bg-blue-600 shadow-md"><svg class="h-4 w-4 rotate-45" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4m0 0h12l-3 4 3 4H4"/></svg></div>',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            })
          : L.divIcon({
            className: "packron-marker",
            html: `<div class="packron-marker-pin" style="${
              active ? "background:oklch(0.72 0.15 60);transform:rotate(-45deg) scale(1.2);" : ""
            }"><span>${index + 1}</span></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          })
      const marker = L.marker([s.lat, s.lng], { icon, interactive: interactive && !heroMap }).addTo(layer)
      if (!heroMap) {
        marker.bindTooltip(`${index + 1}. ${s.name}`, { direction: "top", offset: [0, -28] })
        marker.on("click", () => selectRef.current(s.id))
      }
    })

    // Controlla se il container della mappa ha dimensioni (visibile a schermo)
    const container = containerRef.current
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      return // Evita calcoli di flyTo/fitBounds se la mappa è nascosta (es. tab mobile chiuso)
    }

    const selected = validStops.find((s) => s.id === selectedId)
    if (selected) {
      try {
        map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 11), { duration: 0.6 })
      } catch (e) {
        // Ignora eventuali errori di animazione
      }
    } else {
      const bounds = L.latLngBounds(boundsLatLngs)
      const paddedBounds = bounds.pad(mode === "city" ? 0.08 : 0.2)

      requestAnimationFrame(() => {
        map.invalidateSize()
        try {
          map.fitBounds(paddedBounds, {
            animate: false,
            maxZoom: mode === "city" ? 15 : undefined,
          })
        } catch (e) {
          // Ignora errori di bounds
        }
      })
    }
  }

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Mappa itinerario" />
}