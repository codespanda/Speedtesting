import { PathIcon } from "@/components/path-icon"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  value: string
  unit: string
  extra?: string
  icon: string
  /** Tailwind classes for the round icon badge, e.g. "bg-dl-soft text-dl-ink". */
  tone: string
  pressed?: boolean
  onClick?: () => void
  className?: string
}

/** Metric tile with a tinted round icon. Renders as a toggle button when onClick is set. */
export function StatCard({ label, value, unit, extra, icon, tone, pressed, onClick, className }: Props) {
  const classes = cn(
    "flex items-center gap-4 rounded-lg border-2 border-transparent bg-card p-4 text-left text-card-foreground shadow-paper",
    onClick &&
      "transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    pressed && "border-primary",
    className,
  )
  const content = (
    <>
      <span className={cn("flex size-12 flex-none items-center justify-center rounded-full", tone)}>
        <PathIcon d={icon} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex items-baseline gap-1">
          <span className="font-mono text-[28px] leading-tight">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </span>
        {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
      </span>
    </>
  )

  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={!!pressed} className={classes}>
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  )
}
