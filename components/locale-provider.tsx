"use client"

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { interpolate, isLocale, messages, type Locale, type MessageKey } from "@/lib/i18n"
import { swapLocaleInPath } from "@/lib/paths"

const STORAGE_KEY = "packron-locale"

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const rawLocale = params?.locale
  const locale: Locale = isLocale(rawLocale)
    ? rawLocale
    : Array.isArray(rawLocale) && isLocale(rawLocale[0])
      ? rawLocale[0]
      : "en"

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000`
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        if (next === locale) return
        window.localStorage.setItem(STORAGE_KEY, next)
        document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000`
        router.push(swapLocaleInPath(pathname, next))
      },
      t: (key, vars) => interpolate(messages[locale][key], vars),
    }),
    [locale, pathname, router],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within LocaleProvider")
  return ctx
}
