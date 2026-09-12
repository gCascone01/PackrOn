"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { AuthForm } from "./auth-form"
import { useI18n } from "@/components/locale-provider"

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  // Portal to document.body: callers live inside transformed/filtered
  // ancestors (e.g. the sticky blurred header), which would otherwise trap
  // `position: fixed` and break viewport centering.
  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t("authTitle")}
    >
      <button
        type="button"
        aria-label={t("authClose")}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("authClose")}
            className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{t("authTitle")}</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">{t("authSubtitle")}</p>
          <AuthForm compact onSuccess={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
