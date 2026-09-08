import type { Metadata } from "next"
import { HowItWorksPage } from "@/components/how-it-works-page"

export const metadata: Metadata = {
  title: "Come funziona — PackrOn",
  description:
    "Scegli road trip o city trip, genera un itinerario con tappe e mappa, poi condividilo senza perdere i dettagli.",
}

export default function Page() {
  return <HowItWorksPage />
}
