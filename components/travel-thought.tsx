"use client"

import { useEffect, useState } from "react"
import { Quote } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import { TRAVEL_THOUGHTS } from "@/lib/travel-thoughts"
import { cn } from "@/lib/utils"

export function TravelThought({ trigger = 0, className }: { trigger?: string | number; className?: string }) {
  const { locale } = useI18n()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const thoughts = TRAVEL_THOUGHTS[locale]

  useEffect(() => {
    setMounted(true)
    setIndex(Math.floor(Math.random() * thoughts.length))
  }, [])

  useEffect(() => {
    if (!mounted) return
    setVisible(false)
    const timeout = window.setTimeout(() => {
      setIndex(Math.floor(Math.random() * thoughts.length))
      setVisible(true)
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [locale, trigger, thoughts.length, mounted])

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-6 items-center justify-center gap-2 text-center text-xs font-medium italic text-muted-foreground transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <Quote className="size-3.5 shrink-0 text-brand/70" aria-hidden="true" />
      <span>{thoughts[index]}</span>
    </p>
  )
}
