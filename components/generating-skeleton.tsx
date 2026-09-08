"use client"

import { Sparkles } from "lucide-react"
import { useI18n } from "@/components/locale-provider"

export function GeneratingSkeleton() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-muted text-brand">
          <Sparkles className="size-5 animate-pulse" />
        </span>
        <div>
          <p className="font-display text-base font-bold text-foreground">{t("skeletonTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("skeletonBody")}</p>
        </div>
      </div>

      <div className="h-24 animate-pulse rounded-2xl bg-muted" />

      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
              <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
