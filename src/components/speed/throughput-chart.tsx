import { useState, type MouseEvent } from "react"

import type { Sample } from "@/lib/cloudflare"
import { CHART_STEPS, niceMax } from "@/lib/speed"

const X0 = 44
const W = 548

type Props = {
  dl: Sample[]
  ul: Sample[]
  focus: string | null
  /** Length of the x axis in seconds. */
  seconds: number
}

/** Live line chart of download and upload throughput over time, with a hover readout. */
export function ThroughputChart({ dl, ul, focus, seconds }: Props) {
  const [hoverT, setHoverT] = useState<number | null>(null)
  const peak = Math.max(0, ...dl.map((s) => s.mbps), ...ul.map((s) => s.mbps))
  const max = niceMax(peak, CHART_STEPS)
  const xOf = (t: number) => X0 + (Math.min(t, seconds) / seconds) * W
  const yOf = (v: number) => 200 - (Math.min(v, max) / max) * 180

  const series = (arr: Sample[]) => {
    if (!arr.length) return { line: "", area: "" }
    const pts = [`${X0},200`, ...arr.map((s) => `${xOf(s.t).toFixed(1)},${yOf(s.mbps).toFixed(1)}`)].join(" ")
    return { line: pts, area: `${pts} ${xOf(arr[arr.length - 1].t).toFixed(1)},200` }
  }
  const d = series(dl)
  const u = series(ul)
  const grid = [0, 1, 2, 3, 4].map((i) => ({ y: yOf((max / 4) * i), label: String(+((max / 4) * i).toFixed(1)) }))

  const nearest = (arr: Sample[], t: number) =>
    arr.length ? arr.reduce((best, s) => (Math.abs(s.t - t) < Math.abs(best.t - t) ? s : best)) : undefined
  const hd = hoverT != null ? nearest(dl, hoverT) : undefined
  const hu = hoverT != null ? nearest(ul, hoverT) : undefined
  const hx = hoverT != null ? xOf(hoverT) : 0
  const tipX = hx > 430 ? hx - 142 : hx + 10
  const hasData = dl.length > 0 || ul.length > 0

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!hasData) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 600
    setHoverT(Math.max(0, Math.min(seconds, ((x - X0) / W) * seconds)))
  }

  return (
    <svg
      viewBox="0 0 600 230"
      width="100%"
      role="img"
      aria-label="Line chart of download and upload speed during the test. Hover to read values."
      onMouseMove={onMove}
      onMouseLeave={() => setHoverT(null)}
      className="block h-auto cursor-crosshair"
    >
      {grid.map((g) => (
        <g key={g.label}>
          <line x1={X0} x2={592} y1={g.y} y2={g.y} stroke="var(--line2)" />
          <text x={36} y={g.y + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
            {g.label}
          </text>
        </g>
      ))}
      <text x={44} y={222} fontSize={11} fill="var(--muted-foreground)">0 s</text>
      <text x={318} y={222} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{seconds / 2} s</text>
      <text x={592} y={222} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">{seconds} s</text>

      <g style={{ opacity: focus === "ul" ? 0.2 : 1, transition: "opacity 200ms" }}>
        <polygon points={d.area} fill="var(--dl)" fillOpacity={0.1} />
        <polyline points={d.line} fill="none" stroke="var(--dl)" strokeWidth={2.5} strokeLinejoin="round" />
      </g>
      <g style={{ opacity: focus === "dl" ? 0.2 : 1, transition: "opacity 200ms" }}>
        <polygon points={u.area} fill="var(--ul)" fillOpacity={0.12} />
        <polyline points={u.line} fill="none" stroke="var(--ul)" strokeWidth={2.5} strokeLinejoin="round" />
      </g>

      {!hasData && (
        <text x={318} y={110} textAnchor="middle" fontSize={14} fill="var(--muted-foreground)">
          Press Start test and the graph draws live
        </text>
      )}

      {hoverT != null && (
        <g>
          <line x1={hx} x2={hx} y1={20} y2={200} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
          {hd && <circle cx={xOf(hd.t)} cy={yOf(hd.mbps)} r={4.5} fill="var(--dl)" stroke="var(--card)" strokeWidth={2} />}
          {hu && <circle cx={xOf(hu.t)} cy={yOf(hu.mbps)} r={4.5} fill="var(--ul)" stroke="var(--card)" strokeWidth={2} />}
          <rect x={tipX} y={22} width={132} height={62} rx={4} fill="var(--card)" stroke="var(--border)" />
          <text x={tipX + 12} y={40} fontSize={11} fill="var(--muted-foreground)">At {hoverT.toFixed(1)} s</text>
          <text x={tipX + 12} y={58} fontSize={12} fill="var(--foreground)" className="font-mono">
            Down {hd ? hd.mbps.toFixed(1) : "—"} Mbps
          </text>
          <text x={tipX + 12} y={75} fontSize={12} fill="var(--foreground)" className="font-mono" xmlSpace="preserve">
            Up   {hu ? hu.mbps.toFixed(1) : "—"} Mbps
          </text>
        </g>
      )}
    </svg>
  )
}
