import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function StepProgress({
  steps,
  current,
}: {
  steps: string[]
  current: number
}) {
  return (
    <ol className="flex items-center rounded-2xl border border-border bg-muted/30 p-2 sm:p-2.5">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
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
                  "hidden truncate text-sm font-medium sm:block",
                  active && "font-semibold text-foreground",
                  done && !active && "text-foreground",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span className="relative mx-2 hidden h-1 flex-1 overflow-hidden rounded-full bg-border sm:block" aria-hidden="true">
                <span className={cn("absolute inset-y-0 left-0 rounded-full bg-brand transition-all duration-500", done ? "w-full" : "w-0")} />
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
