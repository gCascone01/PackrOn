"use client"

import { useEffect, useState } from "react"
import { Quote } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import type { Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const TRAVEL_THOUGHTS: Record<Locale, string[]> = {
  it: [
    "Calcolando le curve più belle...",
    "Stimando i caffè necessari per la tappa 2...",
    "I pedaggi fanno male al cuore, ma la strada no.",
    "Cercando la deviazione che vale la deviazione.",
    "Mettendo in fila panorami e soste strategiche.",
    "Controllando se quel borgo merita davvero una pausa.",
    "Misurando la distanza tra te e il prossimo gelato.",
    "Dando un senso poetico alla partenza presto.",
    "Calcolando il rapporto ideale tra strada e aperitivo.",
    "Evitando il traffico, almeno sulla carta.",
    "Lasciando spazio alle sorprese, ma non ai buchi nel programma.",
    "Chiedendo alla mappa dove nasconde la vista migliore.",
    "Inserendo una pausa panoramica assolutamente necessaria.",
    "Verificando la disponibilità di tramonti memorabili.",
    "Dando priorità alle strade con una bella storia.",
    "Contando le curve, per non farle sentire sole.",
    "Scegliendo tappe che fanno bene alle gambe e alle foto.",
    "Tenendo d'occhio il carburante e il carattere.",
    "Cercando parcheggi vicini e pazienza lontana.",
    "Preparando un itinerario con margine per dire: fermiamoci qui.",
    "Mettendo il pilota automatico solo nella fantasia.",
    "Tracciando una linea tra voglia di partire e destinazione.",
    "Consultando le stelle. E anche le coordinate.",
    "Sistemando le soste prima che arrivi la fame.",
    "Selezionando luoghi con un ottimo potenziale da ricordo.",
    "Calcolando l'ora giusta per quel belvedere.",
    "Rendendo la strada parte della vacanza.",
    "Controllando che nessun chilometro sia sprecato.",
    "Preparando il piano B, nel caso il piano A abbia vista mare.",
    "Quasi pronti: manca solo scegliere il posto lato finestrino.",
  ],
  en: [
    "Calculating the most beautiful bends...",
    "Estimating the coffees needed for day two...",
    "Tolls hurt the heart, but the road does not.",
    "Looking for the detour worth taking.",
    "Arranging viewpoints and strategic stops.",
    "Checking whether that village really deserves a pause.",
    "Measuring the distance to your next gelato.",
    "Giving an early start a poetic reason.",
    "Calculating the perfect road-to-aperitivo ratio.",
    "Avoiding traffic, at least on paper.",
    "Leaving room for surprises, not gaps in the schedule.",
    "Asking the map where it hides the best view.",
    "Adding a panoramic break that is absolutely necessary.",
    "Checking the availability of memorable sunsets.",
    "Giving priority to roads with a good story.",
    "Counting the bends, so they do not feel lonely.",
    "Choosing stops that are good for legs and photos.",
    "Keeping an eye on fuel and morale.",
    "Finding nearby parking and distant patience.",
    "Building in room to say: let us stop here.",
    "Putting the autopilot in the imagination only.",
    "Drawing a line between wanderlust and destination.",
    "Consulting the stars. And the coordinates.",
    "Sorting the stops before hunger arrives.",
    "Selecting places with excellent memory-making potential.",
    "Calculating the perfect hour for that viewpoint.",
    "Making the road part of the holiday.",
    "Checking that no kilometre goes to waste.",
    "Preparing plan B, in case plan A has a sea view.",
    "Almost ready: just pick the window seat.",
  ],
}

export function TravelThought({ trigger = 0, className }: { trigger?: string | number; className?: string }) {
  const { locale } = useI18n()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const thoughts = TRAVEL_THOUGHTS[locale]

  useEffect(() => {
    setMounted(true)
    setIndex(Math.floor(Math.random() * thoughts.length))
  }, [])

  useEffect(() => {
    if (!mounted) return
    setVisible(false)
    const timeout = window.setTimeout(() => {
      setIndex(Math.floor(Math.random() * thoughts.length))
      setVisible(true)
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [locale, trigger, thoughts.length, mounted])

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-6 items-center justify-center gap-2 text-center text-xs font-medium italic text-muted-foreground transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <Quote className="size-3.5 shrink-0 text-brand/70" aria-hidden="true" />
      <span>{thoughts[index]}</span>
    </p>
  )
}
