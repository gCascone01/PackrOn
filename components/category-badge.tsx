"use client"

import type { StopCategory } from "@/lib/types"
import { CATEGORY_KEYS } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import {
  Building2,
  Camera,
  Landmark,
  Leaf,
  Moon,
  ParkingCircle,
  UtensilsCrossed,
  Castle,
  type LucideIcon,
} from "lucide-react"
import { useI18n } from "@/components/locale-provider"

const META: Record<StopCategory, { icon: LucideIcon; className: string }> = {
  citta: { icon: Building2, className: "bg-brand-muted text-[color:var(--brand)]" },
  natura: { icon: Leaf, className: "bg-emerald-50 text-emerald-700" },
  borgo: { icon: Castle, className: "bg-amber-50 text-amber-700" },
  panorama: { icon: Camera, className: "bg-sky-50 text-sky-700" },
  food: { icon: UtensilsCrossed, className: "bg-rose-50 text-rose-700" },
  cultura: { icon: Landmark, className: "bg-violet-50 text-violet-700" },
  sosta: { icon: ParkingCircle, className: "bg-slate-100 text-slate-600" },
  notte: { icon: Moon, className: "bg-indigo-50 text-indigo-700" },
}

export function CategoryBadge({
  category,
  className,
}: {
  category: StopCategory
  className?: string
}) {
  const { t } = useI18n()
  const { icon: Icon, className: tone } = META[category]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {t(CATEGORY_KEYS[category])}
    </span>
  )
}
