const CX = 160
const CY = 176

const polar = (deg: number, r: number) => {
  const t = (deg * Math.PI) / 180
  return [CX + r * Math.cos(t), CY + r * Math.sin(t)] as const
}

const arc = (a0: number, a1: number, r: number) => {
  const p0 = polar(a0, r)
  const p1 = polar(a1, r)
  return `M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A ${r} ${r} 0 0 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`
}

const TICKS = Array.from({ length: 11 }, (_, i) => {
  const a = 180 + 18 * i
  const o = polar(a, 112)
  const n = polar(a, i % 2 === 0 ? 100 : 105)
  return { x1: o[0], y1: o[1], x2: n[0], y2: n[1] }
})

const short = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(+v.toFixed(1)))

type Props = {
  /** Value in Mbps shown by the needle. */
  gauge: number
  /** Top of the scale in Mbps. */
  max: number
  color: string
  num: string
  unit: string
  numColor: string
  running: boolean
}

/** Half-circle speed gauge from 0 to `max` Mbps. */
export function SpeedMeter({ gauge, max, color, num, unit, numColor, running }: Props) {
  const f = Math.max(0, Math.min(gauge, max)) / max
  const dot = polar(180 + 180 * f, 130)
  const labels = Array.from({ length: 6 }, (_, i) => {
    const q = polar(180 + 36 * i, 158)
    return { x: q[0], y: q[1], label: short((max / 5) * i) }
  })

  return (
    <svg
      viewBox="-20 0 360 205"
      width="100%"
      role="img"
      aria-label={`Speed meter, 0 to ${max} Mbps, now ${num} ${unit}`}
      className="block h-auto max-w-[400px]"
    >
      <path d={arc(180, 360, 130)} fill="none" stroke="var(--track)" strokeWidth={18} />
      {f > 0.002 && <path d={arc(180, 180 + 180 * f, 130)} fill="none" stroke={color} strokeWidth={18} />}
      {TICKS.map((k, i) => (
        <line key={i} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} stroke="var(--tick)" strokeWidth={1.5} />
      ))}
      {labels.map((m, i) => (
        <text
          key={i}
          x={m.x}
          y={m.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fill="var(--muted-foreground)"
        >
          {m.label}
        </text>
      ))}
      {running && <circle className="halo" cx={dot[0]} cy={dot[1]} r={12} fill="none" stroke={color} />}
      <circle cx={dot[0]} cy={dot[1]} r={12} strokeWidth={4} fill="var(--card)" stroke={color} />
      <text x={160} y={160} textAnchor="middle" fontSize={48} fontWeight={300} className="font-mono" fill={numColor}>
        {num}
      </text>
      <text x={160} y={192} textAnchor="middle" fontSize={15} fill="var(--muted-foreground)">
        {unit}
      </text>
    </svg>
  )
}
