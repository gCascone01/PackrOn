"use client"

import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/locale-provider"

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme()
  const { t } = useI18n()

  if (!mounted) return null

  const themes: Array<{ value: "light" | "dark" | "system"; icon: typeof Sun; label: string }> = [
    { value: "light", icon: Sun, label: t("themeLight") },
    { value: "dark", icon: Moon, label: t("themeDark") },
    { value: "system", icon: Monitor, label: t("themeSystem") },
  ]

  return (
    <div
      role="group"
      aria-label={t("themeAria")}
      className="inline-flex items-center rounded-full border border-border bg-card p-0.5"
    >
{themes.map((themeOption) => {
        const active = theme === themeOption.value
        const Icon = themeOption.icon
        return (
          <button
            key={themeOption.value}
            type="button"
            onClick={() => setTheme(themeOption.value)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{themeOption.label}</span>
          </button>
        )
      })}
    </div>
  )
}