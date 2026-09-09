import { cn } from "@/lib/utils"
import { Building2, CarFront, Compass, Mountain, Route, Sparkles } from "lucide-react"
import type { ReactNode } from "react"

export function WizardPreview({
  mode,
  title,
  detail,
  accent = "brand",
  icon,
  meta,
  label,
}: {
  mode: "road" | "city"
  title: string
  detail: string
  accent?: "brand" | "amber" | "green"
  icon?: ReactNode
  meta: string
  label: string
}) {
  const Icon = icon ? null : mode === "road" ? CarFront : Building2

  return (
    <aside
      aria-label={label}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-colors duration-500",
        accent === "amber" && "border-amber-300/60 bg-amber-50/70",
        accent === "green" && "border-emerald-300/60 bg-emerald-50/70",
        accent === "brand" && "border-brand/20 bg-brand-muted/45",
      )}
    >
      <div className="relative z-10 flex items-center gap-4">
        <div
          className={cn(
            "relative flex size-14 shrink-0 items-center justify-center rounded-2xl border bg-card shadow-sm transition-all duration-500",
            accent === "amber" && "border-amber-300 text-amber-700",
            accent === "green" && "border-emerald-300 text-emerald-700",
            accent === "brand" && "border-brand/25 text-brand",
          )}
        >
          <span className="absolute inset-1.5 rounded-xl border border-dashed border-current/20" aria-hidden="true" />
          {icon ?? (Icon ? <Icon className="size-6" /> : null)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="size-3 text-brand" />
            {label}
          </div>
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{detail}</div>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <Route className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{meta}</span>
        </div>
      </div>
      <div className="relative mt-4 h-6" aria-hidden="true">
        <div className="absolute left-0 right-0 top-3 h-px bg-current/15" />
        <div className="absolute left-[8%] top-[7px] size-3 rounded-full border-2 border-current bg-card" />
        <div className="absolute left-[48%] top-[7px] size-3 rounded-full border-2 border-current bg-card" />
        <div className="absolute right-[8%] top-[7px] size-3 rounded-full border-2 border-current bg-card" />
        <div className="absolute left-[8%] top-[3px] h-2 w-[40%] rounded-full bg-current/20" />
      </div>
      <Mountain className="absolute -bottom-8 -right-2 size-28 rotate-[-8deg] text-current/10" aria-hidden="true" />
      {mode === "city" ? <Compass className="absolute -right-2 top-3 size-16 text-current/10" aria-hidden="true" /> : null}
    </aside>
  )
}
