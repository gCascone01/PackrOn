"use client"

import { useEffect, useRef, useState } from "react"
import { MousePointer2 } from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

const CSS_PIXELS_PER_METER = 96 / 0.0254

function formatMeters(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "it-IT", {
    minimumFractionDigits: value < 1 ? 2 : 1,
    maximumFractionDigits: value < 1 ? 2 : 1,
  }).format(value)
}

export function MouseDistanceCounter({ className }: { className?: string }) {
  const { locale, t } = useI18n()
  const [isDesktop, setIsDesktop] = useState(false)
  const [meters, setMeters] = useState(0)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const distancePixels = useRef(0)
  const lastPaint = useRef(0)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px) and (pointer: fine)")
    const updateDevice = () => setIsDesktop(media.matches)
    updateDevice()
    media.addEventListener("change", updateDevice)
    return () => media.removeEventListener("change", updateDevice)
  }, [])

  useEffect(() => {
    if (!isDesktop) return

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const previous = lastPoint.current
      lastPoint.current = { x: event.clientX, y: event.clientY }
      if (!previous) return

      distancePixels.current += Math.hypot(event.clientX - previous.x, event.clientY - previous.y)
      const now = performance.now()
      if (now - lastPaint.current < 120) return
      lastPaint.current = now
      setMeters(distancePixels.current / CSS_PIXELS_PER_METER)
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      lastPoint.current = null
    }
  }, [isDesktop])

  if (!isDesktop) return null

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-brand/15 bg-card/65 p-3 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
        <MousePointer2 className="size-4" aria-hidden="true" />
      </span>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("mouseDistance", { meters: formatMeters(meters, locale) })}
      </p>
    </div>
  )
}
