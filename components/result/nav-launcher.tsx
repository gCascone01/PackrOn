"use client"

import type { Stop } from "@/lib/types"
import { appleMapsUrl, googleMapsUrl, wazeUrl } from "@/lib/nav-links"
import { MapPin, Navigation2 } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

// Apple Inc. logo (bitten apple). Lucide's `Apple` icon is a fruit, so it
// cannot be used for the Apple Maps button. Path from Font Awesome Free
// (fa-apple, CC BY 4.0 by Fonticons, Inc.).
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" fill="currentColor" className={className} aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}

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
            <NavButton href={appleMapsUrl(stop)} label="Apple Maps" icon={<AppleLogo className="size-4" />} />
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
