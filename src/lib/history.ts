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

function read(): SavedRun[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedRun[]
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
