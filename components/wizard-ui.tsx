"use client"

import type { ReactNode } from "react"
import {
  Building2,
  CarFront,
  Check,
  Compass,
  Minus,
  Mountain,
  Plus,
  Route,
  Sparkles,
} from "lucide-react"
import { useI18n } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

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
  onChange: (value: boolean) => void
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

export function StepProgress({
  steps,
  current,
  onSelect,
}: {
  steps: string[]
  current: number
  /** Jump to a step (forward jumps run the same validation as Continue). */
  onSelect?: (index: number) => void
}) {
  return (
    <ol className="flex items-center rounded-2xl border border-border bg-muted/30 p-2 sm:p-2.5">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        const clickable = Boolean(onSelect) && !active
        const content = (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                  done && "bg-brand text-brand-foreground",
                  active && "bg-brand text-brand-foreground ring-4 ring-brand/15",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden min-w-0 truncate text-sm font-medium sm:block",
                  active && "font-semibold text-foreground",
                  done && !active && "text-foreground",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span className="relative mx-2 hidden h-1 flex-1 overflow-hidden rounded-full bg-border md:block" aria-hidden="true">
                <span className={cn("absolute inset-y-0 left-0 rounded-full bg-brand transition-all duration-500", done ? "w-full" : "w-0")} />
              </span>
            ) : null}
          </>
        )
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "relative flex min-w-0 flex-1 items-center rounded-xl px-1.5 py-1.5 transition-all duration-300 sm:px-2",
              active && "bg-card shadow-sm ring-1 ring-brand/15",
              done && !active && "bg-brand-muted/45",
            )}
          >
            {clickable ? (
              <button
                type="button"
                onClick={() => onSelect?.(i)}
                aria-label={label}
                className="flex min-w-0 flex-1 cursor-pointer items-center rounded-lg transition hover:bg-card/70 hover:shadow-sm hover:ring-1 hover:ring-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function WizardPreview({
  mode,
  title,
  detail,
  accent = "brand",
  icon,
  meta,
  label,
}: {
  mode: "road" | "city"
  title: string
  detail: string
  accent?: "brand" | "amber" | "green"
  icon?: ReactNode
  meta: string
  label: string
}) {
  const Icon = icon ? null : mode === "road" ? CarFront : Building2

  return (
    <aside
      aria-label={label}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-colors duration-500",
        accent === "amber" && "border-amber-300/60 bg-amber-50/70",
        accent === "green" && "border-emerald-300/60 bg-emerald-50/70",
        accent === "brand" && "border-brand/20 bg-brand-muted/45",
      )}
    >
      <div className="relative z-10 flex items-center gap-4">
        <div
          className={cn(
            "relative flex size-14 shrink-0 items-center justify-center rounded-2xl border bg-card shadow-sm transition-all duration-500",
            accent === "amber" && "border-amber-300 text-amber-700",
            accent === "green" && "border-emerald-300 text-emerald-700",
            accent === "brand" && "border-brand/25 text-brand",
          )}
        >
          <span className="absolute inset-1.5 rounded-xl border border-dashed border-current/20" aria-hidden="true" />
          {icon ?? (Icon ? <Icon className="size-6" /> : null)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="size-3 text-brand" />
            {label}
          </div>
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{detail}</div>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <Route className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{meta}</span>
        </div>
      </div>
      <div className="relative mt-4 h-6" aria-hidden="true">
        <div className="absolute left-0 right-0 top-3 h-px bg-current/15" />
        <div className="absolute left-[8%] top-[7px] size-3 rounded-full border-2 border-current bg-card" />
        <div className="absolute left-[48%] top-[7px] size-3 rounded-full border-2 border-current bg-card" />
        <div className="absolute right-[8%] top-[7px] size-3 rounded-full border-2 border-current bg-card" />
        <div className="absolute left-[8%] top-[3px] h-2 w-[40%] rounded-full bg-current/20" />
      </div>
      <Mountain className="absolute -bottom-8 -right-2 size-28 rotate-[-8deg] text-current/10" aria-hidden="true" />
      {mode === "city" ? <Compass className="absolute -right-2 top-3 size-16 text-current/10" aria-hidden="true" /> : null}
    </aside>
  )
}
