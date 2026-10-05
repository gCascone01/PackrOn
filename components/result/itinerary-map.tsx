"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState } from "react"
import type { Map as LeafletMap, LayerGroup, Polyline } from "leaflet"
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
  const lastRouteQueryRef = useRef<string | null>(null)

  // Origin (house marker + origin leg) is road-only: city trips explore the
  // city itself, so ignore any origin passed for city mode — including
  // legacy rows saved with originLat/Lng.
  const effectiveOrigin = mode === "road" ? origin : undefined

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
      if (effectiveOrigin && typeof effectiveOrigin.lat === "number" && typeof effectiveOrigin.lng === "number" && Number.isFinite(effectiveOrigin.lat) && Number.isFinite(effectiveOrigin.lng)) {
        points.push({ lat: effectiveOrigin.lat, lng: effectiveOrigin.lng })
      }
      points.push(...validStops)

      if (points.length < 2) {
        if (!cancelled) setRouteGeometries(null)
        return
      }

      const profile = mode === "road" ? "driving" : "foot"
      const coordinateString = points.map((p) => `${p.lng},${p.lat}`).join(";")
      const queryKey = `${profile}|${coordinateString}`
      // The parent rebuilds `stops` on every render, which re-runs this
      // effect with identical coordinates — skip the redundant request.
      // The key is recorded only when a fetch actually completes: recording
      // it upfront broke everything under dev double-effects (the first
      // fetch is aborted by cleanup, the second pass then mistakes the key
      // for "already loaded" and straight lines stay forever).
      if (lastRouteQueryRef.current === queryKey) return
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

        if (cancelled) return
        lastRouteQueryRef.current = queryKey
        if (data.routes && data.routes.length > 0) {
          const geojson = data.routes[0].geometry
          if (geojson && geojson.type === "LineString" && geojson.coordinates) {
            const coords: [number, number][] = geojson.coordinates.map((c: [number, number]) => [c[1], c[0]])
            setRouteGeometries(coords)
          } else {
            setRouteGeometries(null)
          }
        } else {
          setRouteGeometries(null)
        }
      } catch (error) {
        // Cleanup aborts the in-flight request on re-run/unmount — that
        // cancellation is expected, not a routing failure, so stay silent
        // and let the next effect run retry (the key stays unrecorded).
        if (cancelled) return
        lastRouteQueryRef.current = queryKey
        if (error instanceof DOMException && error.name === "AbortError") {
          console.warn("OSRM route request timed out, falling back to straight lines.")
        } else {
          console.warn("Failed to fetch real route from OSRM, falling back to straight lines.", error)
        }
        setRouteGeometries(null)
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
        scrollWheelZoom: heroMap ? false : interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        attributionControl,
      }).setView(mode === "city" ? [37.39, -5.99] : [48.2, 16.37], mode === "city" ? 13 : 7)
      if (heroMap) map.attributionControl?.setPrefix(false)
      if (heroMap) {
        const endpointPane = map.createPane("heroEndpointPane")
        endpointPane.style.zIndex = "650"
        endpointPane.style.pointerEvents = "none"
      }
      if (zoomControl) L.control.zoom({ position: "bottomright" }).addTo(map)
      const cartoApiKey = heroMap ? process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY : undefined
      const tileUrl = cartoApiKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey)}`
        : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      const tileAttribution = cartoApiKey
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : heroMap
          ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          : '&copy; OpenStreetMap contributors'
      L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        ...(cartoApiKey ? { subdomains: ["a", "b", "c", "d"] } : {}),
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
  }, [stops, selectedId, routeGeometries, effectiveOrigin])

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

    if (effectiveOrigin && typeof effectiveOrigin.lat === "number" && typeof effectiveOrigin.lng === "number" && Number.isFinite(effectiveOrigin.lat) && Number.isFinite(effectiveOrigin.lng)) {
      boundsLatLngs.push([effectiveOrigin.lat, effectiveOrigin.lng] as [number, number])
    }

    const polylineStyles = {
      color: heroMap ? "#0891b2" : "oklch(0.55 0.216 264)",
      weight: heroMap || mode === "road" ? 4 : 3,
      opacity: heroMap ? 0.95 : mode === "road" ? 0.9 : 0.75,
      dashArray: heroMap || mode === "road" ? undefined : "1 8",
      lineCap: "round" as const,
      ...(heroMap ? { lineJoin: "round" as const } : {}),
    }
    let heroRoute: Polyline | null = null
    const addRouteLine = (points: [number, number][]) => {
      if (heroMap) {
        L.polyline(points, { ...polylineStyles, color: "#ffffff", weight: 8, opacity: 0.55 }).addTo(layer)
      }
      const route = L.polyline(points, polylineStyles).addTo(layer)
      if (heroMap) heroRoute = route
      return route
    }

    if (routeGeometries) {
      addRouteLine(routeGeometries)
    }

    const homeIcon = L.divIcon({
      className: heroMap ? "" : "packron-marker",
      html: heroMap
        ? '<div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-cyan-600 bg-white shadow-md"><span class="h-2.5 w-2.5 rounded-full bg-cyan-600"></span></div>'
        : '<div class="packron-marker-pin" style="background:oklch(0.55 0.216 264);transform:rotate(-45deg);"><span class="text-xs font-bold">🏠</span></div>',
      iconSize: heroMap ? [28, 28] : [30, 30],
      iconAnchor: heroMap ? [14, 14] : [15, 30],
    })

    // Add origin point and line from origin to first stop (road trips only)
    if (effectiveOrigin && typeof effectiveOrigin.lat === "number" && typeof effectiveOrigin.lng === "number" && !isNaN(effectiveOrigin.lat) && !isNaN(effectiveOrigin.lng)) {
      const originLatLng: [number, number] = [effectiveOrigin.lat, effectiveOrigin.lng]
      
      if (!routeGeometries && !heroMap) {
        // Draw line from origin to first stop
        L.polyline([originLatLng, latlngs[0]], polylineStyles).addTo(layer)
      }

      const originMarker = L.marker(originLatLng, {
        icon: homeIcon,
        interactive: interactive && !heroMap,
        pane: heroMap ? "heroEndpointPane" : "markerPane",
        zIndexOffset: heroMap ? 1000 : 0,
      }).addTo(layer)
      if (!heroMap) originMarker.bindTooltip(`${effectiveOrigin.name || "Start"}`, { direction: "top", offset: [0, -28] })
    }

    if (!routeGeometries) {
      addRouteLine(heroMap && effectiveOrigin && Number.isFinite(effectiveOrigin.lat) && Number.isFinite(effectiveOrigin.lng)
        ? [[effectiveOrigin.lat, effectiveOrigin.lng], ...latlngs]
        : latlngs)
    }

    validStops.forEach((s, index) => {
      const active = s.id === selectedId
      const isDestination = heroMap && !loop && index === validStops.length - 1
      const isStart = heroMap && !effectiveOrigin && index === 0
      const icon = heroMap && !isDestination && !isStart
        ? L.divIcon({
            className: "",
            html: '<div class="h-2.5 w-2.5 rounded-full bg-cyan-600 ring-2 ring-white"></div>',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          })
        : heroMap && isDestination
          ? L.divIcon({
              className: "",
              html: '<div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-cyan-600 shadow-md"><span class="h-2.5 w-2.5 rounded-full border-2 border-white"></span></div>',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })
          : heroMap && isStart
            ? homeIcon
          : L.divIcon({
            className: "packron-marker",
            html: `<div class="packron-marker-pin" style="${
              active ? "background:oklch(0.72 0.15 60);transform:rotate(-45deg) scale(1.2);" : ""
            }"><span>${s.seq}</span></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          })
      const isHeroEndpoint = isDestination || isStart
      const marker = L.marker([s.lat, s.lng], {
        icon,
        interactive: interactive && !heroMap,
        pane: isHeroEndpoint ? "heroEndpointPane" : "markerPane",
        zIndexOffset: isHeroEndpoint ? 1000 : 0,
      }).addTo(layer)
      if (!heroMap) {
        marker.bindTooltip(`${s.seq}. ${s.name}`, { direction: "top", offset: [0, -28] })
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
          if (heroMap && heroRoute) {
            map.fitBounds(heroRoute.getBounds(), { padding: [35, 35], animate: false })
          } else {
            map.fitBounds(paddedBounds, {
              animate: false,
              maxZoom: mode === "city" ? 15 : undefined,
            })
          }
        } catch (e) {
          // Ignora errori di bounds
        }
      })
    }
  }

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Mappa itinerario" />
}