"use client"

import { HomeCta, MarketingShell } from "@/components/marketing-shell"
import { useI18n } from "@/components/locale-provider"
import type { MessageKey } from "@/lib/i18n"

const STEPS: Array<{ title: MessageKey; body: MessageKey }> = [
  { title: "howStep1Title", body: "howStep1Body" },
  { title: "howStep2Title", body: "howStep2Body" },
  { title: "howStep3Title", body: "howStep3Body" },
  { title: "howStep4Title", body: "howStep4Body" },
]

export function HowItWorksPage() {
  const { t } = useI18n()

  return (
    <MarketingShell eyebrow="howEyebrow" title="howTitle" intro="howIntro">
      <ol className="flex flex-col gap-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/[0.03]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-sm font-bold text-brand">
              {index + 1}
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">{t(step.title)}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(step.body)}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <HomeCta label="howCta" />
      </div>
    </MarketingShell>
  )
}
