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
  citta: { icon: Building2, className: "bg-brand-muted text-[color:var(--brand)] dark:bg-brand/20 dark:text-[color:var(--brand)]" },
  natura: { icon: Leaf, className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200" },
  borgo: { icon: Castle, className: "bg-amber-50 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200" },
  panorama: { icon: Camera, className: "bg-sky-50 text-sky-700 dark:bg-sky-400/20 dark:text-sky-200" },
  food: { icon: UtensilsCrossed, className: "bg-rose-50 text-rose-700 dark:bg-rose-400/20 dark:text-rose-200" },
  cultura: { icon: Landmark, className: "bg-violet-50 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200" },
  sosta: { icon: ParkingCircle, className: "bg-slate-100 text-slate-600 dark:bg-slate-400/20 dark:text-slate-200" },
  notte: { icon: Moon, className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200" },
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
