"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "packron-theme"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start with the same value on server and client to avoid
  // hydration mismatches. The real preference is synced in the mount effect below.
  const [theme, setThemeState] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // The cookie is the source of truth. On first visit (no cookie yet) the
    // theme is initialized from the OS preference and persisted immediately.
    // A legacy localStorage value (including the old "system" mode) is
    // migrated once, then removed.
    const stored = getCookie(STORAGE_KEY)
    let initial: Theme
    if (isTheme(stored)) {
      initial = stored
    } else {
      const legacy = window.localStorage.getItem(STORAGE_KEY)
      initial = isTheme(legacy)
        ? legacy
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
      setCookie(STORAGE_KEY, initial)
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setThemeState(initial)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    root.style.colorScheme = theme
  }, [theme])

  const setTheme = (nextTheme: Theme) => {
    setCookie(STORAGE_KEY, nextTheme)
    setThemeState(nextTheme)
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      mounted,
    }),
    [theme, mounted]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
