"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  const isHome = pathname === "/"

  useEffect(() => {
    setReady(true)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          onClick={onBrandClick}
          className={cn("flex items-center gap-3", isHome && "pointer-events-none")}
          aria-label="PackrOn home"
        >
          {!isHome ? (
            <Image
              src="/logo.png"
              alt="PackrOn logo"
              width={180}
              height={60}
              priority
              className="h-10 w-auto object-contain"
            />
          ) : null}
          <span className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-[2rem]">
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
        </div>
      </div>
    </header>
  )
}
