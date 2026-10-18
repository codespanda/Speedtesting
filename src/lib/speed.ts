export type Phase = "idle" | "ping" | "download" | "upload" | "done"

export const fmt = (v: number) => (v >= 1000 ? v.toFixed(0) : v >= 100 ? v.toFixed(1) : v.toFixed(2))

/** Smallest "round" scale maximum that fits `v`, so low and gigabit speeds both read well. */
export function niceMax(v: number, steps: readonly number[]) {
  return steps.find((s) => s >= v) ?? Math.ceil(v / steps[steps.length - 1]) * steps[steps.length - 1]
}

export const GAUGE_STEPS = [10, 50, 100, 250, 500, 1000, 2500, 5000] as const
export const CHART_STEPS = [4, 20, 40, 100, 200, 400, 800, 1200, 2000, 4000] as const

export const ICONS = {
  download: "M12 4v13M6 11l6 6 6-6M5 20h14",
  upload: "M12 20V7M6 13l6-6 6 6M5 4h14",
  latency: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  jitter: "M3 12h3l2-5 3 10 3-7 2 2h5",
  bars: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  pulse: "M2 12h4l2.5-6 4 12 3-9 2 3H22",
  settings: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4",
  tv: "M3 5h18v12H3zM8 21h8M12 17v4",
  video: "M15 10l5-3v10l-5-3M3 6h12v12H3z",
  gamepad: "M6 12h4M8 10v4M15 11h.01M18 13h.01M7 6h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 6z",
  bigDownload: "M12 3v12M7 10l5 5 5-5M4 21h16",
  cloud: "M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 7.9M12 12v8M9 15l3-3 3 3",
} as const

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" })
  } catch {
    return null
  }
})()

/** "IN" → "India"; falls back to the code. */
export const countryName = (code: string) => {
  try {
    return (code && regionNames?.of(code)) || code
  } catch {
    return code
  }
}
