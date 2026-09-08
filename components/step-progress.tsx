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
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                done && "bg-brand text-brand-foreground",
                active && "bg-brand text-brand-foreground ring-4 ring-brand/15",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm font-medium sm:block",
                active || done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "ml-1 hidden h-px flex-1 sm:block",
                  done ? "bg-brand" : "bg-border",
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
