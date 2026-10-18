import { CheckIcon, Link2Icon, Loader2Icon, MapPinIcon, PlayIcon, SquareIcon } from "lucide-react"
import { Fragment, useState } from "react"
import { toast } from "sonner"

import { PathIcon } from "@/components/path-icon"
import { SpeedMeter } from "@/components/speed/speed-meter"
import { StatCard } from "@/components/speed/stat-card"
import { ThroughputChart } from "@/components/speed/throughput-chart"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useConnection } from "@/hooks/use-connection"
import { TEST_SECONDS, useSpeedTest } from "@/hooks/use-speed-test"
import { formatTime, useHistory } from "@/lib/history"
import type { Sample } from "@/lib/cloudflare"
import { cn } from "@/lib/utils"
import { countryName, fmt, GAUGE_STEPS, ICONS, niceMax } from "@/lib/speed"

type Focus = "dl" | "ul" | "ping" | "jit" | null

const STEP_LABELS = ["Latency", "Download", "Upload", "Results"]
const PHASE_ORDER = ["ping", "download", "upload", "done"]
/** Rough length of a whole run, for the "time left" readout. */
const TOTAL_SECONDS = 2 + TEST_SECONDS * 2

export function TestPage() {
  const [focus, setFocus] = useState<Focus>(null)
  const [devices, setDevices] = useState(3)

  const conn = useConnection()
  const history = useHistory()
  const meta = conn.meta
  // Cloudflare routes every visitor to its nearest data center, so there is one server and no picker.
  const sv = meta
    ? {
        name: `Cloudflare ${meta.colo.code}`,
        city: meta.colo.city,
        place: [meta.colo.city, countryName(meta.colo.country)].filter(Boolean).join(", ") || "Nearest location",
      }
    : null
  const t = useSpeedTest({ provider: meta?.provider ?? "", serverName: sv?.name ?? "Cloudflare", serverPlace: sv?.place ?? "" })
  const { phase, running, done } = t
  const toggleFocus = (f: Exclude<Focus, null>) => setFocus((cur) => (cur === f ? null : f))

  const startTest = () => {
    if (!sv) return
    t.start()
  }

  // Big readout
  let bigLabel = "Ready"
  let bigNum = "—"
  let bigUnit = "Mbps"
  let bigColor = "var(--foreground)"
  let bigHint = sv
    ? `${sv.name}, ${sv.place}`
    : conn.status === "error"
      ? (conn.error ?? "Could not reach the test server")
      : "Finding the nearest test server…"
  if (t.error && phase === "idle") bigHint = t.error
  if (phase === "ping") {
    bigLabel = "Measuring latency"
    bigNum = t.live.toFixed(0)
    bigUnit = "ms"
    bigHint = `Sending small requests to ${sv?.city || "the server"}`
  } else if (phase === "download") {
    bigLabel = "Download"
    bigNum = fmt(t.live)
    bigColor = "var(--dl)"
    bigHint = "Receiving from the server"
  } else if (phase === "upload") {
    bigLabel = "Upload"
    bigNum = fmt(t.live)
    bigColor = "var(--ul)"
    bigHint = "Sending to the server"
  } else if (done) {
    bigLabel = "Result"
    bigNum = fmt(t.dl ?? 0)
    bigColor = "var(--dl)"
    bigUnit = "Mbps download"
    bigHint = `Upload ${fmt(t.ul ?? 0)} Mbps · latency ${t.ping} ms`
  }
  const gauge = phase === "download" || phase === "upload" ? t.live : done ? (t.dl ?? 0) : 0
  // Scale the gauge to the fastest value seen in this run so slow and gigabit links both read well.
  const gaugeMax = niceMax(Math.max(gauge, t.dl ?? 0, ...t.dlS.map((s) => s.mbps), ...t.ulS.map((s) => s.mbps)), GAUGE_STEPS)

  const cur = phase === "idle" ? -1 : PHASE_ORDER.indexOf(phase)

  const stats = (arr: Sample[]) => {
    if (!arr.length) return "Not measured yet"
    const v = arr.map((s) => s.mbps)
    const steady = v.slice(Math.floor(v.length / 5))
    return `Peak ${Math.max(...v).toFixed(1)} · low ${Math.min(...(steady.length ? steady : v)).toFixed(1)}`
  }

  const cards = [
    {
      key: "dl" as const, label: "Download", unit: "Mbps", tone: "bg-dl-soft text-dl-ink", icon: ICONS.download,
      value: t.dl != null ? fmt(t.dl) : phase === "download" ? fmt(t.live) : "—", extra: stats(t.dlS),
    },
    {
      key: "ul" as const, label: "Upload", unit: "Mbps", tone: "bg-ul-soft text-ul-ink", icon: ICONS.upload,
      value: t.ul != null ? fmt(t.ul) : phase === "upload" ? fmt(t.live) : "—", extra: stats(t.ulS),
    },
    {
      key: "ping" as const, label: "Latency", unit: "ms", tone: "bg-pu-soft text-pu-ink", icon: ICONS.latency,
      value: t.ping != null ? String(t.ping) : phase === "ping" ? t.live.toFixed(0) : "—",
      extra: sv?.city ? `Round trip to ${sv.city}` : "Round trip to the server",
    },
    {
      key: "jit" as const, label: "Jitter", unit: "ms", tone: "bg-gr-soft text-gr-ink", icon: ICONS.jitter,
      value: t.jitter != null ? String(t.jitter) : "—", extra: "Lower is steadier",
    },
  ]

  // "What your connection can handle"
  const judge = (score: number) =>
    !done
      ? { verdict: "Run a test", bar: "var(--tick)", text: "text-muted-foreground", pct: 0 }
      : score >= 3
        ? { verdict: "Excellent", bar: "var(--good)", text: "text-gr-ink", pct: 100 }
        : score >= 1.5
          ? { verdict: "Good", bar: "var(--good)", text: "text-gr-ink", pct: Math.round((score / 3) * 100) }
          : score >= 1
            ? { verdict: "Just enough", bar: "var(--warn)", text: "text-warn-ink", pct: Math.round((score / 3) * 100) }
            : { verdict: "May struggle", bar: "var(--warn)", text: "text-warn-ink", pct: Math.max(6, Math.round((score / 3) * 100)) }
  const dlPer = done ? (t.dl ?? 0) / devices : 0
  const ulPer = done ? (t.ul ?? 0) / devices : 0
  const per = devices > 1 ? ` each on ${devices} devices` : ""
  const uses = [
    { label: "4K streaming", need: `25 Mbps down${per}`, icon: ICONS.tv, ...judge(dlPer / 25) },
    { label: "HD video calls", need: `4 Mbps up${per}`, icon: ICONS.video, ...judge(ulPer / 4) },
    { label: "Online gaming", need: "Latency under 40 ms", icon: ICONS.gamepad, ...judge(done ? 40 / (t.ping || 1) / 1.2 : 0) },
    { label: "Big game downloads", need: "100 GB in under an hour", icon: ICONS.bigDownload, ...judge((dlPer / 230) * 1.5) },
    { label: "Cloud backups", need: `20 Mbps up${per}`, icon: ICONS.cloud, ...judge(ulPer / 20) },
  ]

  const copyResult = async () => {
    const text = `Pulse speed test: ${fmt(t.dl ?? 0)} Mbps down, ${fmt(t.ul ?? 0)} Mbps up, ${t.ping} ms latency${sv ? ` (${sv.name}, ${sv.place})` : ""}`
    try {
      await navigator.clipboard.writeText(text)
      toast("Result copied to clipboard")
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const ipValue = (v: string | undefined) => (conn.status === "loading" ? "…" : v || "Unavailable")

  return (
    <div className="flex flex-col gap-6">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-normal tracking-[0.25px] sm:text-[34px]">Check your connection</h1>
          <p className="mt-1.5 text-base text-muted-foreground">
            Measures latency, download and upload against the nearest Cloudflare server.
          </p>
        </div>
        <a
          href="https://speed.cloudflare.com/"
          target="_blank"
          rel="noreferrer"
          className="text-[13px] text-muted-foreground no-underline hover:text-primary"
        >
          Test servers by Cloudflare
        </a>
      </div>

      {/* Speed test panel */}
      <section aria-label="Speed test" className="overflow-hidden rounded-lg bg-card shadow-paper">
        <div className="grid grid-cols-4 items-start gap-y-2 border-b px-2 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:px-6 sm:py-[18px]">
          {STEP_LABELS.map((label, i) => {
            const isDone = cur > i || (done && i === 3)
            const active = cur === i && !done
            return (
              <Fragment key={label}>
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium text-primary-foreground transition-colors",
                      isDone || active ? "bg-primary" : "bg-tick",
                    )}
                  >
                    {isDone ? <CheckIcon className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn("text-xs sm:text-sm", isDone || active ? "text-foreground" : "text-muted-foreground", active && "font-medium")}>
                    {label}
                  </span>
                </div>
                {i < 3 && <span className="mx-1 hidden h-px w-10 bg-border sm:block" />}
              </Fragment>
            )
          })}
          <span
            className={cn(
              "col-span-4 text-center font-mono text-[13px] text-muted-foreground sm:ml-auto sm:text-right",
              !running && "hidden sm:inline",
            )}
          >
            {running ? `~${Math.max(1, Math.round((1 - t.prog) * TOTAL_SECONDS))} s left` : ""}
          </span>
        </div>
        <div className="h-1 bg-primary-soft">
          <div className="h-1 bg-primary transition-[width] duration-200" style={{ width: `${t.prog * 100}%` }} />
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Gauge */}
          <div className="flex min-w-0 flex-col items-center gap-4 border-b p-4 sm:p-6 lg:w-[40%] lg:flex-none lg:border-r lg:border-b-0">
            <div className="flex items-center justify-between self-stretch">
              <span className="text-xs font-medium tracking-[1px] text-muted-foreground uppercase">{bigLabel}</span>
              <span className="inline-flex h-8 max-w-[60%] items-center gap-1.5 rounded-full bg-primary-soft px-2.5 text-[13px] font-medium text-primary">
                {conn.status === "loading" && !sv ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <MapPinIcon className="size-3.5" />
                )}
                <span className="truncate">{sv ? sv.city || sv.name : conn.status === "error" ? "Unavailable" : "Finding server"}</span>
              </span>
            </div>
            <SpeedMeter
              gauge={gauge}
              max={gaugeMax}
              color={phase === "upload" ? "var(--ul)" : "var(--dl)"}
              num={bigNum}
              unit={bigUnit}
              numColor={bigColor}
              running={running}
            />
            <div className={cn("min-h-5 text-center text-sm", t.error && phase === "idle" ? "text-destructive" : "text-muted-foreground")}>
              {bigHint}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {!running && (
                <Button
                  onClick={conn.status === "error" ? conn.refresh : startTest}
                  disabled={!sv && conn.status !== "error"}
                  className="h-12 gap-2.5 rounded-full px-7 text-[15px] tracking-[0.46px] uppercase shadow-raised hover:bg-primary-hover"
                >
                  <PlayIcon className="size-[18px] fill-current" />
                  {conn.status === "error" ? "Try again" : done ? "Run again" : "Start test"}
                </Button>
              )}
              {running && (
                <Button
                  variant="outline"
                  onClick={t.cancel}
                  className="h-12 gap-2.5 rounded-full border-primary bg-transparent px-6 text-[15px] tracking-[0.46px] text-primary uppercase hover:bg-primary-soft hover:text-primary dark:border-primary dark:bg-transparent"
                >
                  <SquareIcon className="size-4 fill-current" />
                  Stop
                </Button>
              )}
              {done && (
                <Button
                  variant="ghost"
                  onClick={copyResult}
                  className="h-12 gap-2 rounded-full px-4 text-[15px] tracking-[0.46px] text-primary uppercase hover:bg-primary-soft hover:text-primary"
                >
                  <Link2Icon className="size-[18px]" />
                  Copy result
                </Button>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium">Throughput over time</h2>
              <div className="flex gap-2">
                {(
                  [
                    ["dl", "Download", "bg-dl"],
                    ["ul", "Upload", "bg-ul"],
                  ] as const
                ).map(([k, label, swatch]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleFocus(k)}
                    aria-pressed={focus === k}
                    className={cn(
                      "inline-flex h-[30px] items-center gap-1.5 rounded-full border px-2.5 text-[13px] transition-colors hover:bg-hover",
                      focus === k && "bg-primary-soft hover:bg-primary-soft",
                    )}
                  >
                    <span className={cn("h-[3px] w-3.5 rounded-sm", swatch)} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ThroughputChart dl={t.dlS} ul={t.ulS} focus={focus} seconds={TEST_SECONDS} />
          </div>
        </div>
      </section>

      {/* Metric cards */}
      <section aria-label="Results" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.key}
            label={c.label}
            value={c.value}
            unit={c.unit}
            extra={c.extra}
            icon={c.icon}
            tone={c.tone}
            pressed={focus === c.key}
            onClick={() => toggleFocus(c.key)}
          />
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        {/* What your connection can handle */}
        <section aria-label="What this means" className="min-w-0 flex-[3_1_440px] rounded-lg bg-card shadow-paper">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <h2 className="text-lg font-medium">What your connection can handle</h2>
            <label className="flex w-full items-center gap-3 text-sm text-muted-foreground sm:w-auto">
              <span className="whitespace-nowrap">Devices at home</span>
              <Slider
                min={1}
                max={8}
                step={1}
                value={[devices]}
                onValueChange={([v]) => setDevices(v)}
                className="flex-auto sm:w-[140px] sm:flex-none"
                aria-label="Devices at home"
              />
              <span className="min-w-5 font-mono font-medium text-foreground">{devices}</span>
            </label>
          </div>
          {uses.map((u) => (
            <div key={u.label} className="flex items-center gap-3 border-t border-line2 px-4 py-3 sm:gap-4 sm:px-5">
              <span className="flex size-9 flex-none items-center justify-center rounded-full bg-primary-soft text-primary">
                <PathIcon d={u.icon} size={18} />
              </span>
              <div className="min-w-0 flex-auto">
                <div className="text-[15px]">{u.label}</div>
                <div className="text-[13px] text-muted-foreground">{u.need}</div>
                {/* Phones: the bar sits under the text so the label keeps the full width. */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-track sm:hidden">
                  <div
                    className="h-1.5 rounded-full transition-[width] duration-600 ease-out"
                    style={{ width: `${u.pct}%`, background: u.bar }}
                  />
                </div>
              </div>
              <div className="hidden h-1.5 w-[140px] flex-none rounded-full bg-track sm:block">
                <div
                  className="h-1.5 rounded-full transition-[width] duration-600 ease-out"
                  style={{ width: `${u.pct}%`, background: u.bar }}
                />
              </div>
              <span className={cn("flex-none text-right text-[13px] font-medium sm:w-[100px]", u.text)}>{u.verdict}</span>
            </div>
          ))}
        </section>

        <div className="flex flex-[2_1_300px] flex-col gap-6">
          {/* Your connection */}
          <section aria-label="Your connection" className="rounded-lg bg-card shadow-paper">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-5">
              <h2 className="text-lg font-medium">Your connection</h2>
              <Button
                variant="ghost"
                disabled={running || conn.status === "loading"}
                onClick={conn.refresh}
                className="h-9 rounded px-2 tracking-[0.4px] text-primary uppercase hover:bg-primary-soft hover:text-primary"
              >
                Refresh
              </Button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 px-4 pb-3 text-sm sm:px-5">
              {(
                [
                  ["Provider", ipValue(meta?.provider), false],
                  ["IP address", ipValue(meta?.ip), true],
                  ["Your location", ipValue(meta ? [meta.city, countryName(meta.country)].filter(Boolean).join(", ") : undefined), false],
                  ["Test server", sv ? `${sv.name} · ${sv.place}` : conn.status === "error" ? "Unavailable" : "…", false],
                ] as const
              ).map(([k, v, mono]) => (
                <Fragment key={k}>
                  <dt className="border-t border-line2 py-2.5 text-muted-foreground">{k}</dt>
                  <dd className={cn("min-w-0 border-t border-line2 py-2.5 text-right break-words", mono && "font-mono text-xs break-all sm:text-sm")}>{v}</dd>
                </Fragment>
              ))}
            </dl>
          </section>

          {/* Recent runs */}
          <section aria-label="Recent runs" className="overflow-hidden rounded-lg bg-card shadow-paper">
            <div className="flex items-baseline justify-between gap-2 px-4 pt-4 pb-2 sm:px-5">
              <h2 className="text-lg font-medium">Recent runs</h2>
              <span className="text-xs text-muted-foreground">Select a run to view it</span>
            </div>
            {history.length === 0 && (
              <div className="border-t border-line2 px-5 py-4 text-sm text-muted-foreground">Your tests will appear here.</div>
            )}
            {history.slice(0, 5).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => !running && t.loadRun(r)}
                aria-pressed={t.activeRun === r.id}
                className={cn(
                  "flex w-full items-center gap-2 border-t border-line2 px-4 py-3 text-left text-sm transition-colors hover:bg-hover sm:gap-3 sm:px-5",
                  t.activeRun === r.id && "bg-primary-soft hover:bg-primary-soft",
                )}
              >
                <span className="w-[44px] flex-none font-mono text-[13px] text-muted-foreground sm:w-[52px]">{formatTime(r.at)}</span>
                <span className="min-w-0 flex-auto font-mono whitespace-nowrap">
                  <span className="text-dl-ink">{r.dl.toFixed(1)}</span> / <span className="text-ul-ink">{r.ul.toFixed(1)}</span>{" "}
                  <span className="hidden font-sans text-xs text-muted-foreground min-[360px]:inline">Mbps</span>
                </span>
                <span className="max-w-[35%] truncate text-[13px] text-muted-foreground">{r.serverPlace.split(",")[0]}</span>
              </button>
            ))}
          </section>
        </div>
      </div>

    </div>
  )
}
