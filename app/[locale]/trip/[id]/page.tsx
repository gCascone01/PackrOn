import type { Metadata } from "next"
import { SavedTripView } from "@/components/trips/saved-trip-view"

export const metadata: Metadata = {
  title: "Itinerario — PackrOn",
  description: "Apri un itinerario PackrOn condiviso.",
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SavedTripView tripId={id} publicView />
}