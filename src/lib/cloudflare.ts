// Speed test against Cloudflare's public speed endpoints (the ones speed.cloudflare.com uses).
// Results stay on this device; Cloudflare sees the request like any website does but publishes nothing.
// These endpoints are not a documented API and could change.

const BASE = "https://speed.cloudflare.com"

export type Sample = { t: number; mbps: number }

export type Meta = {
  ip: string
  provider: string
  asn: number | null
  city: string
  region: string
  country: string
  /** Cloudflare data center serving this visitor. */
  colo: { code: string; city: string; country: string }
}

export async function fetchMeta(signal?: AbortSignal): Promise<Meta> {
  const res = await fetch(`${BASE}/meta`, { signal })
  if (!res.ok) throw new Error(`Connection lookup failed (${res.status})`)
  const js = await res.json()
  if (!js.colo) throw new Error("Could not reach the Cloudflare test server")
  return {
    ip: js.clientIp ?? "",
    provider: js.asOrganization ?? "",
    asn: js.asn ?? null,
    city: js.city ?? "",
    region: js.region ?? "",
    country: js.country ?? "",
    colo: { code: js.colo.iata ?? "", city: js.colo.city ?? "", country: js.colo.cca2 ?? "" },
  }
}

/** TCP round trip in ms, from the `cfL4` Server-Timing entry Cloudflare adds to each response. */
function tcpRttMs(res: Response): number | null {
  const m = /[?&]rtt=(\d+)/.exec(res.headers.get("server-timing") ?? "")
  return m ? Number(m[1]) / 1000 : null
}

export type LatencyResult = { ping: number; jitter: number }

/**
 * Sends tiny requests and reads the TCP round trip Cloudflare measured for each.
 * Falls back to the browser-side request time if that header is missing.
 */
export async function measureLatency({
  samples = 10,
  signal,
  onSample,
}: { samples?: number; signal?: AbortSignal; onSample?: (ms: number) => void } = {}): Promise<LatencyResult> {
  const out: number[] = []
  for (let i = 0; i <= samples; i++) {
    const t0 = performance.now()
    const res = await fetch(`${BASE}/__down?bytes=0&r=${Math.random()}`, { cache: "no-store", signal })
    await res.arrayBuffer()
    const ms = tcpRttMs(res) ?? performance.now() - t0
    if (i === 0) continue // first request includes connection setup
    out.push(ms)
    onSample?.(ms)
  }
  const sorted = out.slice().sort((a, b) => a - b)
  let diff = 0
  for (let i = 1; i < out.length; i++) diff += Math.abs(out[i] - out[i - 1])
  return {
    ping: Math.round(sorted[Math.floor(sorted.length / 2)]),
    jitter: Math.round(out.length > 1 ? diff / (out.length - 1) : 0),
  }
}

type RunOptions = { seconds: number; onSample: (s: Sample) => void; signal: AbortSignal }

/** Parallel connections; enough to fill most home links without overloading slow ones. */
const STREAMS = 4
/** Ignore the first part of each run while TCP ramps up. */
const WARMUP_S = 1.5
const SAMPLE_MS = 250

/** A run fails only if this many requests error before any data gets through. */
const MAX_FAILURES = 8
/** How long in-flight uploads may keep going after time is up, so their bytes still count. */
const DRAIN_MS = 3000

type Pump = (addBytes: (n: number) => void, signal: AbortSignal, stream: number) => Promise<void>

/**
 * Drives a timed transfer over STREAMS parallel connections. `pump` runs one request and resolves
 * when it finishes; each connection keeps restarting it until time is up. A single failed request
 * is retried rather than failing the whole test. With `drain`, requests already in flight when
 * time runs out are allowed to finish (up to DRAIN_MS) instead of being cut off.
 * Returns the steady-state speed in Mbps.
 */
async function timedTransfer(pump: Pump, { seconds, onSample, signal }: RunOptions, drain = false): Promise<number> {
  const ctrl = new AbortController()
  const abortAll = () => ctrl.abort()
  signal.addEventListener("abort", abortAll)

  const start = performance.now()
  let total = 0
  let lastByteAt = start
  let warmBytes = 0
  let warmAt = 0
  let stopping = false
  let failures = 0
  let drainTimer: number | undefined
  const history: { t: number; bytes: number }[] = [{ t: 0, bytes: 0 }]
  const addBytes = (n: number) => {
    total += n
    lastByteAt = performance.now()
  }

  const ticker = window.setInterval(() => {
    const t = (performance.now() - start) / 1000
    history.push({ t, bytes: total })
    if (!warmAt && t >= WARMUP_S) {
      warmAt = t
      warmBytes = total
    }
    if (t <= seconds) {
      // Live value: average over the last second, so the readout is responsive but not jumpy.
      const from = history.find((h) => h.t >= t - 1) ?? history[0]
      const dt = t - from.t
      if (dt > 0) onSample({ t, mbps: ((total - from.bytes) * 8) / dt / 1e6 })
    }
    if (t >= seconds && !stopping) {
      stopping = true
      if (drain) drainTimer = window.setTimeout(abortAll, DRAIN_MS)
      else abortAll()
    }
  }, SAMPLE_MS)

  const worker = async (stream: number) => {
    while (!stopping && !ctrl.signal.aborted) {
      try {
        await pump(addBytes, ctrl.signal, stream)
      } catch (e) {
        if (ctrl.signal.aborted) return
        // Retry transient failures; give up only if nothing is getting through at all.
        if (++failures >= MAX_FAILURES && total === 0) throw e
        await new Promise((r) => setTimeout(r, 200))
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: STREAMS }, (_, i) => worker(i)))
  } catch (e) {
    abortAll()
    throw e
  } finally {
    window.clearInterval(ticker)
    window.clearTimeout(drainTimer)
    signal.removeEventListener("abort", abortAll)
  }
  if (signal.aborted) throw new DOMException("Test cancelled", "AbortError")

  // With draining, the run ends when the last bytes arrived, not when the clock hit `seconds`.
  const elapsed = ((drain ? lastByteAt : performance.now()) - start) / 1000
  if (warmAt && elapsed > warmAt && total > warmBytes) return ((total - warmBytes) * 8) / (elapsed - warmAt) / 1e6
  return elapsed > 0 ? (total * 8) / elapsed / 1e6 : 0
}

const DOWN_CHUNK = 25_000_000

export function runDownload(opts: RunOptions) {
  return timedTransfer(async (addBytes, signal) => {
    const res = await fetch(`${BASE}/__down?bytes=${DOWN_CHUNK}&r=${Math.random()}`, { cache: "no-store", signal })
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`)
    const reader = res.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return
        addBytes(value.byteLength)
      }
    } finally {
      reader.cancel().catch(() => {})
    }
  }, opts)
}

const UP_MIN = 64 * 1024
const UP_START = 256 * 1024
const UP_MAX = 8 * 1024 * 1024
let upPayload: Blob | null = null

/**
 * Uploads with plain fetch POSTs. A Blob body with no type sends no Content-Type, so these stay
 * "simple" CORS requests with no preflight (XMLHttpRequest progress listeners force one, which
 * Safari rejected). Bytes are counted when each request completes, so chunk sizes adapt per
 * connection: they double while requests finish quickly and halve when they get slow.
 */
export function runUpload(opts: RunOptions) {
  upPayload ??= new Blob([new Uint8Array(UP_MAX)])
  const payload = upPayload
  const sizes = Array.from({ length: STREAMS }, () => UP_START)
  return timedTransfer(
    async (addBytes, signal, stream) => {
      const size = sizes[stream]
      const t0 = performance.now()
      const res = await fetch(`${BASE}/__up?r=${Math.random()}`, {
        method: "POST",
        body: payload.slice(0, size),
        signal,
      })
      await res.arrayBuffer()
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      addBytes(size)
      const ms = performance.now() - t0
      if (ms < 300) sizes[stream] = Math.min(size * 2, UP_MAX)
      else if (ms > 1500) sizes[stream] = Math.max(size / 2, UP_MIN)
    },
    opts,
    true,
  )
}
