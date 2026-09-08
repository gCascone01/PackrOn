"use client"

import { useState } from "react"
import { MarketingShell } from "@/components/marketing-shell"
import { SiteHeader } from "@/components/site-header"
import { ResultView } from "@/components/result/result-view"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/locale-provider"
import { buildCityTripItinerary, buildRoadTripItinerary } from "@/lib/mock-itinerary"
import type { Itinerary } from "@/lib/types"
import { ArrowRight, Building2, Route } from "lucide-react"

export function ExamplesPage() {
  const { t } = useI18n()
  const [open, setOpen] = useState<Itinerary | null>(null)

  if (open) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader onBrandClick={() => setOpen(null)} />
        <ResultView initial={open} onBack={() => setOpen(null)} />
      </div>
    )
  }

  return (
    <MarketingShell eyebrow="examplesEyebrow" title="examplesTitle" intro="examplesIntro" wide>
      <div className="grid gap-5 md:grid-cols-2">
        <ExampleCard
          kicker={t("exampleRoadKicker")}
          title={t("exampleRoadTitle")}
          body={t("exampleRoadBody")}
          icon={Route}
          onOpen={() => setOpen(buildRoadTripItinerary())}
          cta={t("exampleOpen")}
        />
        <ExampleCard
          kicker={t("exampleCityKicker")}
          title={t("exampleCityTitle")}
          body={t("exampleCityBody")}
          icon={Building2}
          onOpen={() => setOpen(buildCityTripItinerary())}
          cta={t("exampleOpen")}
        />
      </div>
    </MarketingShell>
  )
}

function ExampleCard({
  kicker,
  title,
  body,
  icon: Icon,
  onOpen,
  cta,
}: {
  kicker: string
  title: string
  body: string
  icon: typeof Route
  onOpen: () => void
  cta: string
}) {
  return (
    <article className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm shadow-black/[0.03]">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-muted text-brand">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand">{kicker}</p>
      <h2 className="mt-1 font-display text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Button type="button" className="mt-5 w-fit" onClick={onOpen}>
        {cta}
        <ArrowRight className="size-4" />
      </Button>
    </article>
  )
}
