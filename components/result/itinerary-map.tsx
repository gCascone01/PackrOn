"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"
import type { Map as LeafletMap, LayerGroup } from "leaflet"
import type { Stop, TripMode } from "@/lib/types"

export interface MapStop extends Stop {
  /** Global sequence number across the trip */
  seq: number
  dayNumber: number
}

export function ItineraryMap({
  stops,
  selectedId,
  onSelect,
  mode = "city",
}: {
  stops: MapStop[]
  selectedId: string | null
  onSelect: (id: string) => void
  mode?: TripMode
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
    if (stops.length === 0) return

    const latlngs = stops.map((s) => [s.lat, s.lng] as [number, number])

    L.polyline(latlngs, {
      color: "oklch(0.55 0.216 264)",
      weight: mode === "road" ? 4 : 3,
      opacity: mode === "road" ? 0.9 : 0.75,
      dashArray: mode === "road" ? undefined : "1 8",
      lineCap: "round",
    }).addTo(layer)

    stops.forEach((s) => {
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
      marker.on("click", () => selectRef.current(s.id))
    })

    const selected = stops.find((s) => s.id === selectedId)
    if (selected) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 11), { duration: 0.6 })
    } else {
      map.fitBounds(L.latLngBounds(latlngs).pad(mode === "city" ? 0.08 : 0.2), {
        animate: false,
        maxZoom: mode === "city" ? 15 : undefined,
      })
    }
  }

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Mappa itinerario" />
}
