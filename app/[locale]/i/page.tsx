import type { Metadata } from "next"
import { SharedItineraryPage } from "@/components/shared-itinerary-page"

export const metadata: Metadata = {
  title: "Itinerario condiviso — PackrOn",
  description: "Itinerario PackrOn condiviso: tappe, mappa e dettagli del viaggio.",
}

export default function Page() {
  return <SharedItineraryPage />
}
