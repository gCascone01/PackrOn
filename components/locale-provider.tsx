"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  interpolate,
  messages,
  type Locale,
  type MessageKey,
} from "@/lib/i18n"

const STORAGE_KEY = "packron-locale"

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function isLocale(value: string | null): value is Locale {
  return value === "it" || value === "en"
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("it")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) setLocaleState(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale, hydrated])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key, vars) => interpolate(messages[locale][key], vars),
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within LocaleProvider")
  return ctx
}
