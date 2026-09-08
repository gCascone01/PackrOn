"use client"

import type { Stop } from "@/lib/types"
import { appleMapsUrl, googleMapsUrl, wazeUrl } from "@/lib/nav-links"
import { Apple, MapPin, Navigation2 } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

export function NavLauncher({ stop }: { stop: Stop | null }) {
  const { t } = useI18n()
  return (
    <div className="border-t border-border bg-card/95 p-3 backdrop-blur">
      {stop ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-1">
            <MapPin className="size-4 shrink-0 text-brand" />
            <span className="truncate text-sm font-semibold text-foreground">
              {t("openInNav", { name: stop.name })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NavButton href={googleMapsUrl(stop)} label="Google Maps" icon={<MapPin className="size-4" />} />
            <NavButton href={wazeUrl(stop)} label="Waze" icon={<Navigation2 className="size-4" />} />
            <NavButton href={appleMapsUrl(stop)} label="Apple Maps" icon={<Apple className="size-4" />} />
          </div>
        </div>
      ) : (
        <p className="px-1 py-1.5 text-center text-sm text-muted-foreground">
          {t("pickStop")}
        </p>
      )}
    </div>
  )
}

function NavButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand px-2 text-xs font-semibold text-brand-foreground transition hover:opacity-90"
    >
      {icon}
      <span className="truncate">{label}</span>
    </a>
  )
}
