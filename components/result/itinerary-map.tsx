"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"
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
}: {
  stops: MapStop[]
  selectedId: string | null
  onSelect: (id: string) => void
  mode?: TripMode
  origin?: OriginPoint
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  // Init map once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current || mapRef.current) return
      leafletRef.current = L
      const map = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: true,
      }).setView(mode === "city" ? [37.39, -5.99] : [48.2, 16.37], mode === "city" ? 13 : 7)
      L.control.zoom({ position: "bottomright" }).addTo(map)
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
  }, [stops, selectedId])

  function renderLayers() {
    const L = leafletRef.current
    const map = mapRef.current
    const layer = layerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()
    if (!stops || stops.length === 0) return

    // Filtra solo le tappe con coordinate valide per evitare crash (NaN)
    const validStops = stops.filter(
      (s) => s && typeof s.lat === "number" && typeof s.lng === "number" && !isNaN(s.lat) && !isNaN(s.lng)
    )
    if (validStops.length === 0) return

    const latlngs = validStops.map((s) => [s.lat, s.lng] as [number, number])

    // Add origin point and line from origin to first stop
    if (origin && typeof origin.lat === "number" && typeof origin.lng === "number" && !isNaN(origin.lat) && !isNaN(origin.lng)) {
      const originLatLng: [number, number] = [origin.lat, origin.lng]
      
      // Draw line from origin to first stop
      L.polyline([originLatLng, latlngs[0]], {
        color: "oklch(0.55 0.216 264)",
        weight: mode === "road" ? 4 : 3,
        opacity: mode === "road" ? 0.9 : 0.75,
        dashArray: mode === "road" ? undefined : "1 8",
        lineCap: "round",
      }).addTo(layer)

      // Add origin marker
      const originIcon = L.divIcon({
        className: "packron-marker",
        html: `<div class="packron-marker-pin" style="background:oklch(0.55 0.216 264);transform:rotate(-45deg);"><span class="text-xs font-bold">🏠</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })
      L.marker(originLatLng, { icon: originIcon }).addTo(layer)
        .bindTooltip(`${origin.name || "Start"}`, { direction: "top", offset: [0, -28] })
    }

    L.polyline(latlngs, {
      color: "oklch(0.55 0.216 264)",
      weight: mode === "road" ? 4 : 3,
      opacity: mode === "road" ? 0.9 : 0.75,
      dashArray: mode === "road" ? undefined : "1 8",
      lineCap: "round",
    }).addTo(layer)

    validStops.forEach((s) => {
      const active = s.id === selectedId
      const icon = L.divIcon({
        className: "packron-marker",
        html: `<div class="packron-marker-pin" style="${
          active ? "background:oklch(0.72 0.15 60);transform:rotate(-45deg) scale(1.2);" : ""
        }"><span>${s.seq}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })
      const marker = L.marker([s.lat, s.lng], { icon }).addTo(layer)
      marker.bindTooltip(`${s.seq}. ${s.name}`, { direction: "top", offset: [0, -28] })
      
      // I pin rimangono sempre cliccabili su qualsiasi dispositivo
      marker.on("click", () => selectRef.current(s.id))
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
      try {
        map.fitBounds(L.latLngBounds(latlngs).pad(mode === "city" ? 0.08 : 0.2), {
          animate: false,
          maxZoom: mode === "city" ? 15 : undefined,
        })
      } catch (e) {
        // Ignora errori di bounds
      }
    }
  }

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Mappa itinerario" />
}