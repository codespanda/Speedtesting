import { useSyncExternalStore } from "react"

import type { Sample } from "@/lib/cloudflare"

export type NetworkType = "Wi‑Fi" | "Ethernet" | "Mobile" | "Unknown"

export type SavedRun = {
  id: string
  /** ISO timestamp. */
  at: string
  dl: number
  ul: number
  ping: number
  jitter: number
  serverName: string
  serverPlace: string
  provider: string
  network: NetworkType
  /** Downsampled throughput curves, for redrawing the chart. */
  dlS: Sample[]
  ulS: Sample[]
}

const KEY = "pulse-history"
const MAX_RUNS = 100
const listeners = new Set<() => void>()
let cache: SavedRun[] | null = null

const NETWORKS: readonly string[] = ["Wi‑Fi", "Ethernet", "Mobile", "Unknown"]
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === "string"
const isSamples = (v: unknown): v is Sample[] =>
  Array.isArray(v) && v.every((s) => s && typeof s === "object" && isNum(s.t) && isNum(s.mbps))

/** Storage can hold anything (old formats, manual edits), so keep only well-formed runs. */
function isRun(v: unknown): v is SavedRun {
  if (!v || typeof v !== "object") return false
  const r = v as Record<string, unknown>
  return (
    isStr(r.id) && isStr(r.at) && !Number.isNaN(Date.parse(r.at)) &&
    isNum(r.dl) && isNum(r.ul) && isNum(r.ping) && isNum(r.jitter) &&
    isStr(r.serverName) && isStr(r.serverPlace) && isStr(r.provider) &&
    isStr(r.network) && NETWORKS.includes(r.network) && isSamples(r.dlS) && isSamples(r.ulS)
  )
}

function read(): SavedRun[] {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    cache = Array.isArray(parsed) ? parsed.filter(isRun).slice(0, MAX_RUNS) : []
  } catch {
    cache = []
  }
  return cache
}

function write(runs: SavedRun[]) {
  cache = runs
  try {
    localStorage.setItem(KEY, JSON.stringify(runs))
  } catch {
    // storage full or blocked; keep in memory for this visit
  }
  listeners.forEach((l) => l())
}

export const addRun = (run: SavedRun) => write([run, ...read()].slice(0, MAX_RUNS))

export function useHistory() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
  )
}

/** Keeps at most `n` evenly spaced points. */
export function downsample(arr: Sample[], n = 40): Sample[] {
  if (arr.length <= n) return arr
  const step = arr.length / n
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]).concat(arr[arr.length - 1])
}

/** Best guess at the connection type; only some browsers (mostly Chrome on Android) expose it. */
export function detectNetwork(): NetworkType {
  const c = (navigator as Navigator & { connection?: { type?: string } }).connection
  switch (c?.type) {
    case "wifi":
      return "Wi‑Fi"
    case "ethernet":
      return "Ethernet"
    case "cellular":
      return "Mobile"
    default:
      return "Unknown"
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

export const formatTime = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
