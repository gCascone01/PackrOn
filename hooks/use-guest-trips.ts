"use client"

import { useCallback, useEffect, useState } from "react"

export type GuestTrip = {
  id: string
  title: string
  destination: string
}

const STORAGE_KEY = "packron-guest-trips"

function readTrips(): GuestTrip[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")
    if (!Array.isArray(value)) return []
    return value.filter(
      (trip): trip is GuestTrip =>
        !!trip &&
        typeof trip === "object" &&
        typeof trip.id === "string" &&
        typeof trip.title === "string" &&
        typeof trip.destination === "string",
    )
  } catch {
    return []
  }
}

export function useGuestTrips() {
  const [trips, setTrips] = useState<GuestTrip[]>([])

  useEffect(() => {
    setTrips(readTrips())
  }, [])

  const addTrip = useCallback((trip: GuestTrip) => {
    setTrips((current) => {
      const next = [trip, ...current.filter((item) => item.id !== trip.id)].slice(0, 20)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Keep the in-memory list usable when browser storage is unavailable.
      }
      return next
    })
  }, [])

  const removeTrip = useCallback((id: string) => {
    setTrips((current) => {
      const next = current.filter((trip) => trip.id !== id)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Keep the in-memory list usable when browser storage is unavailable.
      }
      return next
    })
  }, [])

  return { trips, addTrip, removeTrip }
}