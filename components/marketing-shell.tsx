"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import { useI18n } from "@/components/locale-provider"
import type { MessageKey } from "@/lib/i18n"

export function MarketingShell({
  eyebrow,
  title,
  intro,
  children,
  wide,
}: {
  eyebrow: MessageKey
  title: MessageKey
  intro: MessageKey
  children: ReactNode
  wide?: boolean
}) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className={`mx-auto px-4 py-10 sm:px-6 lg:py-16 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">{t(eyebrow)}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-4xl">
          {t(title)}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">{t(intro)}</p>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  )
}

export function HomeCta({ label }: { label: MessageKey }) {
  const { t } = useI18n()
  return (
    <Link
      href="/"
      className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
    >
      {t(label)}
    </Link>
  )
}
