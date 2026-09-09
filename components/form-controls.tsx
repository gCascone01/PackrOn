"use client"

import { cn } from "@/lib/utils"
import { Minus, Plus } from "lucide-react"
import type { ReactNode } from "react"
import { useI18n } from "@/components/locale-provider"

export function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string
  hint?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon ? <span className="text-brand">{icon}</span> : null}
          {label}
        </label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground shadow-xs outline-none transition-all duration-200 ease-out",
        "placeholder:text-muted-foreground hover:border-brand/45 hover:shadow-sm focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20",
        className,
      )}
      {...props}
    />
  )
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-xs outline-none transition-all duration-200 ease-out",
        "placeholder:text-muted-foreground hover:border-brand/45 hover:shadow-sm focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20",
        className,
      )}
      {...props}
    />
  )
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20",
        active
          ? "border-brand bg-brand-muted text-[color:var(--brand)] shadow-sm ring-1 ring-brand/15"
          : "border-border bg-card text-muted-foreground hover:border-brand/45 hover:text-foreground hover:shadow-sm",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function OptionCard({
  active,
  onClick,
  title,
  description,
  icon,
}: {
  active?: boolean
  onClick?: () => void
  title: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full flex-col items-start gap-1 rounded-2xl border p-4 text-left outline-none transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20",
        active
          ? "border-brand bg-brand-muted/60 shadow-sm ring-1 ring-brand/20"
          : "border-border bg-card hover:border-brand/45 hover:shadow-sm",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </span>
      {description ? (
        <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
      ) : null}
    </button>
  )
}

export function NumberStepper({
  value,
  min = 1,
  max = 30,
  unit,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  unit?: string
  onChange: (value: number) => void
}) {
  const { t } = useI18n()
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  return (
    <div className="inline-flex h-11 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xs transition-all duration-200 hover:border-brand/35 hover:shadow-sm">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label={t("decrease")}
        className="flex size-9 items-center justify-center rounded-lg text-foreground outline-none transition-all duration-200 hover:bg-brand-muted hover:text-brand active:scale-90 focus-visible:ring-3 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-[92px] text-center text-sm font-semibold tabular-nums text-foreground">
        {value} {unit}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label={t("increase")}
        className="flex size-9 items-center justify-center rounded-lg text-foreground outline-none transition-all duration-200 hover:bg-brand-muted hover:text-brand active:scale-90 focus-visible:ring-3 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-xs outline-none transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/45 hover:shadow-sm active:translate-y-0 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-brand" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  )
}
