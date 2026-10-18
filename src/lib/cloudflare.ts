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

/**
 * Drives a timed transfer. `pump(addBytes, signal)` runs one connection and resolves when its
 * request finishes; it is restarted until time is up. Returns the steady-state speed in Mbps.
 */
async function timedTransfer(
  pump: (addBytes: (n: number) => void, signal: AbortSignal) => Promise<void>,
  { seconds, onSample, signal }: RunOptions,
): Promise<number> {
  const ctrl = new AbortController()
  const stop = () => ctrl.abort()
  signal.addEventListener("abort", stop)

  const start = performance.now()
  let total = 0
  let warmBytes = 0
  let warmAt = 0
  const history: { t: number; bytes: number }[] = [{ t: 0, bytes: 0 }]
  const addBytes = (n: number) => {
    total += n
  }

  const ticker = window.setInterval(() => {
    const t = (performance.now() - start) / 1000
    history.push({ t, bytes: total })
    if (!warmAt && t >= WARMUP_S) {
      warmAt = t
      warmBytes = total
    }
    // Live value: average over the last second, so the readout is responsive but not jumpy.
    const from = history.find((h) => h.t >= t - 1) ?? history[0]
    const dt = t - from.t
    if (dt > 0) onSample({ t, mbps: ((total - from.bytes) * 8) / dt / 1e6 })
    if (t >= seconds) stop()
  }, SAMPLE_MS)

  const worker = async () => {
    while (!ctrl.signal.aborted) {
      try {
        await pump(addBytes, ctrl.signal)
      } catch (e) {
        if (ctrl.signal.aborted) return
        throw e
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: STREAMS }, worker))
  } catch (e) {
    stop()
    throw e
  } finally {
    window.clearInterval(ticker)
    signal.removeEventListener("abort", stop)
  }
  if (signal.aborted) throw new DOMException("Test cancelled", "AbortError")

  const elapsed = (performance.now() - start) / 1000
  if (warmAt && elapsed > warmAt) return ((total - warmBytes) * 8) / (elapsed - warmAt) / 1e6
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

const UP_CHUNK = 4_000_000
let upPayload: Blob | null = null

/** Uses XMLHttpRequest because fetch cannot report upload progress. */
export function runUpload(opts: RunOptions) {
  upPayload ??= new Blob([new Uint8Array(UP_CHUNK)])
  const payload = upPayload
  return timedTransfer(
    (addBytes, signal) =>
      new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        let sent = 0
        xhr.upload.onprogress = (e) => {
          addBytes(e.loaded - sent)
          sent = e.loaded
        }
        xhr.onload = () => {
          addBytes(UP_CHUNK - sent)
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed (${xhr.status})`))
        }
        xhr.onerror = () => reject(new Error("Upload failed: network error"))
        xhr.onabort = () => resolve()
        signal.addEventListener("abort", () => xhr.abort(), { once: true })
        xhr.open("POST", `${BASE}/__up?r=${Math.random()}`)
        // text/plain keeps this a "simple" request, so no CORS preflight per chunk.
        xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8")
        xhr.send(payload)
      }),
    opts,
  )
}
