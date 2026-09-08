"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass } from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useI18n } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/come-funziona", key: "navHow" as const },
  { href: "/esempi", key: "navExamples" as const },
]

export function SiteHeader({ onBrandClick }: { onBrandClick?: () => void }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          onClick={onBrandClick}
          className="flex items-center gap-2.5"
          aria-label="PackrOn home"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
            <Compass className="size-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
            Packr<span className="text-brand">On</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          {NAV.map((item) => {
            const active = ready && pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition hover:text-foreground",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(item.key)}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            <span className="size-1.5 rounded-full bg-brand" />
            {t("aiPlanner")}
          </span>
        </div>
      </div>
    </header>
  )
}
