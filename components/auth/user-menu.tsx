"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CircleUserRound, FolderHeart, LogIn, LogOut, Settings2 } from "lucide-react"
import { useAuth } from "./auth-provider"
import { AuthDialog } from "./auth-dialog"
import { useI18n } from "@/components/locale-provider"
import { localizedPath } from "@/lib/paths"
import { displayName } from "@/lib/username"
import { Button } from "@/components/ui/button"

export function UserMenu() {
  const { t, locale } = useI18n()
  const { user, loading, configured, signOut } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    window.addEventListener("mousedown", onPointer)
    return () => window.removeEventListener("mousedown", onPointer)
  }, [menuOpen])

  if (loading) {
    return <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
  }

  if (!configured) {
    return (
      <Link
        href={localizedPath(locale, "/login")}
        className="hidden text-xs font-medium text-muted-foreground hover:text-foreground sm:block"
        title={t("authNotConfigured")}
      >
        {t("authLogin")}
      </Link>
    )
  }

  if (!user) {
    return (
      <>
        <Button variant="outline" size="lg" onClick={() => setDialogOpen(true)}>
          <LogIn className="size-4" />
          {t("authLogin")}
        </Button>
        <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </>
    )
  }

  const label = displayName(user)

  const doSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      setMenuOpen(false)
      router.push(localizedPath(locale, "/"))
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="lg"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        title={label}
      >
        <CircleUserRound className="size-4" />
        <span className="max-w-24 truncate sm:max-w-36">{label}</span>
      </Button>
      {menuOpen ? (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-card p-1 shadow-lg">
          <Link
            role="menuitem"
            href={localizedPath(locale, "/trips")}
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted"
          >
            <FolderHeart className="size-4" />
            {t("authMyTrips")}
          </Link>
          <Link
            role="menuitem"
            href={localizedPath(locale, "/account")}
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted"
          >
            <Settings2 className="size-4" />
            {t("authAccount")}
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={doSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="size-4" />
            {signingOut ? t("authWorking") : t("authLogout")}
          </button>
        </div>
      ) : null}
    </div>
  )
}
