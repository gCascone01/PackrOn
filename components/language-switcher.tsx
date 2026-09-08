"use client"

import { LOCALE_LABEL, type Locale } from "@/lib/i18n"
import { useI18n } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t("langAria")}
      className="inline-flex items-center rounded-full border border-border bg-card p-0.5"
    >
      {(["it", "en"] as Locale[]).map((code) => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition",
              active
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LOCALE_LABEL[code]}
          </button>
        )
      })}
    </div>
  )
}
