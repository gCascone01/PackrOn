"use client"

import type { TripMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Building2, Car, Check } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

export function ModeSelector({
  mode,
  onChange,
}: {
  mode: TripMode
  onChange: (mode: TripMode) => void
}) {
  const { t } = useI18n()
  const modes: Array<{
    id: TripMode
    icon: typeof Car
    title: string
    subtitle: string
  }> = [
    {
      id: "road",
      icon: Car,
      title: t("modeRoadTitle"),
      subtitle: t("modeRoadSubtitle"),
    },
    {
      id: "city",
      icon: Building2,
      title: t("modeCityTitle"),
      subtitle: t("modeCitySubtitle"),
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {modes.map((m) => {
        const active = mode === m.id
        const Icon = m.icon
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={active}
            className={cn(
              "group relative flex items-start gap-4 rounded-2xl border p-5 text-left outline-none transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20",
              active
                ? "border-brand bg-card shadow-md ring-1 ring-brand/20"
                : "border-border bg-card hover:border-brand/45 hover:shadow-md",
            )}
          >
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl transition",
                active
                  ? "bg-brand text-brand-foreground"
                  : "bg-muted text-muted-foreground group-hover:text-foreground",
              )}
            >
              <Icon className="size-6" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-display text-base font-bold text-foreground">{m.title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{m.subtitle}</span>
            </span>
            {active ? (
              <span className="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Check className="size-3.5" />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
