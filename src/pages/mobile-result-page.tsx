import { CheckIcon, Link2Icon } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { PathIcon } from "@/components/path-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatTime, useHistory } from "@/lib/history"
import type { Sample } from "@/lib/cloudflare"
import { cn } from "@/lib/utils"
import { fmt } from "@/lib/speed"
import { ICONS } from "@/lib/speed"

/** Scales a saved curve into the 320×90 sparkline box (x over 10 s, y to the shared peak). */
function sparkline(arr: Sample[], peak: number) {
  if (!arr.length || peak <= 0) return ""
  return ["0,85", ...arr.map((p) => `${((Math.min(p.t, 10) / 10) * 320).toFixed(1)},${(85 - (p.mbps / peak) * 70).toFixed(1)}`)].join(" ")
}

/** Score is how many times over the requirement the connection is. */
function verdict(score: number) {
  if (score >= 3) return { pct: 100, verdict: "Excellent", good: true }
  if (score >= 1.5) return { pct: Math.round((score / 3) * 100), verdict: "Very good", good: true }
  if (score >= 1) return { pct: Math.round((score / 3) * 100), verdict: "Just enough", good: false }
  return { pct: Math.max(6, Math.round((score / 3) * 100)), verdict: "May struggle", good: false }
}

const TABS = [
  { id: "test", label: "Test", icon: ICONS.pulse },
  { id: "settings", label: "Settings", icon: ICONS.settings },
] as const

/** Phone layout of a finished result (design board "Mobile result"). */
export function MobileResultPage() {
  const [tab, setTab] = useState<string>("test")
  const run = useHistory()[0]
  const peak = run ? Math.max(1, ...run.dlS.map((p) => p.mbps), ...run.ulS.map((p) => p.mbps)) : 1
  const dlLine = run ? sparkline(run.dlS, peak) : ""
  const ulLine = run ? sparkline(run.ulS, peak) : ""
  const goodFor = run
    ? [
        { label: "4K streaming", ...verdict(run.dl / 25) },
        { label: "Video calls", ...verdict(run.ul / 4) },
        { label: "Online gaming", ...verdict(40 / (run.ping || 1) / 1.2) },
      ]
    : []

  return (
    <div className="mx-auto flex h-svh max-w-[430px] flex-col overflow-hidden bg-background">
      <header className="flex h-14 flex-none items-center gap-3 bg-appbar pr-1 pl-4 text-white shadow-appbar">
        <PathIcon d={ICONS.pulse} strokeWidth={2.2} />
        <span className="flex-auto text-xl font-medium">Pulse</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Copy link to result"
          disabled={!run}
          onClick={async () => {
            if (!run) return
            try {
              await navigator.clipboard.writeText(`Pulse speed test: ${fmt(run.dl)} Mbps down, ${fmt(run.ul)} Mbps up, ${run.ping} ms latency`)
              toast("Result copied to clipboard")
            } catch {
              toast.error("Could not copy to clipboard")
            }
          }}
          className="size-12 rounded-full text-white hover:bg-white/15 hover:text-white dark:hover:bg-white/15"
        >
          <Link2Icon className="size-[22px]" />
        </Button>
      </header>
      <div className="h-1 flex-none bg-primary" />

      <main className="flex flex-auto flex-col gap-3 overflow-y-auto p-4">
        {!run && (
          <div className="flex flex-auto flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground">
            No results yet. Run a test to see it here.
            <Button asChild className="h-12 rounded px-6 text-[15px] tracking-[0.46px] uppercase hover:bg-primary-hover">
              <Link to="/">Start test</Link>
            </Button>
          </div>
        )}
        {run && (
        <>
        <div className="rounded-lg bg-card p-5 shadow-paper">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-[1px] text-muted-foreground uppercase">Download</span>
            <Badge className="h-6 gap-1 rounded-full bg-gr-soft px-2 text-xs font-medium text-gr-ink">
              <CheckIcon className="size-3" strokeWidth={3} />
              Done · {formatTime(run.at)}
            </Badge>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-mono text-[64px] leading-none font-light tracking-[-2px] text-dl">{fmt(run.dl)}</span>
            <span className="text-lg text-muted-foreground">Mbps</span>
          </div>
          <svg
            viewBox="0 0 320 90"
            width="100%"
            role="img"
            aria-label="Download and upload speed during the test"
            className="mt-3 block h-auto"
          >
            <line x1={0} x2={320} y1={85} y2={85} stroke="var(--border)" />
            <line x1={0} x2={320} y1={45} y2={45} stroke="var(--line2)" />
            <line x1={0} x2={320} y1={5} y2={5} stroke="var(--line2)" />
            <polygon points={`${dlLine} ${dlLine.split(" ").pop()?.split(",")[0]},85`} fill="var(--dl)" fillOpacity={0.1} />
            <polyline points={dlLine} fill="none" stroke="var(--dl)" strokeWidth={2.5} strokeLinejoin="round" />
            <polygon points={`${ulLine} ${ulLine.split(" ").pop()?.split(",")[0]},85`} fill="var(--ul)" fillOpacity={0.14} />
            <polyline points={ulLine} fill="none" stroke="var(--ul)" strokeWidth={2.5} strokeLinejoin="round" />
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Upload", value: fmt(run.ul), unit: "Mbps", cls: "text-ul-ink" },
            { label: "Latency", value: String(run.ping), unit: "ms", cls: "" },
            { label: "Jitter", value: String(run.jitter), unit: "ms", cls: "" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg bg-card p-3 shadow-paper">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className={cn("mt-0.5 font-mono text-xl", m.cls)}>{m.value}</div>
              <div className="text-[11px] text-muted-foreground">{m.unit}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-card shadow-paper">
          <div className="px-4 pt-3.5 pb-1.5 text-[15px] font-medium">Good for</div>
          {goodFor.map((g) => (
            <div key={g.label} className="flex items-center gap-3 border-t border-line2 px-4 py-2.5">
              <span className="flex-auto text-sm">{g.label}</span>
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-track">
                <span className={cn("block h-full", g.good ? "bg-good" : "bg-warn")} style={{ width: `${g.pct}%` }} />
              </span>
              <span className={cn("w-[72px] text-right text-xs font-medium", g.good ? "text-gr-ink" : "text-warn-ink")}>{g.verdict}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-card px-4 py-1 text-sm shadow-paper">
          <div className="flex justify-between border-b border-line2 py-2.5">
            <span className="text-muted-foreground">Provider</span>
            <span className="text-right">{run.provider || "Unknown"}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-muted-foreground">Server</span>
            <span className="text-right">{run.serverName} · {run.serverPlace}</span>
          </div>
        </div>

        <Button asChild className="h-12 flex-none rounded text-[15px] tracking-[0.46px] uppercase shadow-paper hover:bg-primary-hover">
          <Link to="/">Run again</Link>
        </Button>
        </>
        )}
      </main>

      <nav aria-label="Primary" className="grid h-16 flex-none grid-cols-2 border-t bg-card">
        {TABS.map((t) => {
          const on = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-xs",
                on ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              <PathIcon d={t.icon} strokeWidth={1.8} />
              {t.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
