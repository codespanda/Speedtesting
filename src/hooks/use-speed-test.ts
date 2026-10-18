import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { addRun, detectNetwork, downsample, type SavedRun } from "@/lib/history"
import { measureLatency, runDownload, runUpload, type Sample } from "@/lib/cloudflare"
import type { Phase } from "@/lib/speed"

/** Each direction runs for this long. */
export const TEST_SECONDS = 10

// Share of the progress bar given to each phase.
const P_PING = 0.08
const P_DL = 0.46

type TestState = {
  phase: Phase
  ping: number | null
  jitter: number | null
  dl: number | null
  ul: number | null
  live: number
  dlS: Sample[]
  ulS: Sample[]
  /** 0 to 1. */
  prog: number
  error: string | null
  activeRun: string | null
}

const RESET = {
  ping: null,
  jitter: null,
  dl: null,
  ul: null,
  live: 0,
  dlS: [],
  ulS: [],
  prog: 0,
  error: null,
} satisfies Partial<TestState>

type Options = {
  provider: string
  /** Label for the test location, e.g. "Cloudflare NAG". */
  serverName: string
  serverPlace: string
}

export function useSpeedTest({ provider, serverName, serverPlace }: Options) {
  const [state, setState] = useState<TestState>({ phase: "idle", ...RESET, activeRun: null })
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const start = useCallback(
    async () => {
      abort.current?.abort()
      const ctrl = new AbortController()
      abort.current = ctrl
      const { signal } = ctrl
      const patch = (p: Partial<TestState>) => !signal.aborted && setState((st) => ({ ...st, ...p }))
      setState((st) => ({ ...st, phase: "ping", ...RESET, activeRun: null }))

      try {
        // 1. Latency
        let n = 0
        const latency = await measureLatency({
          samples: 10,
          signal,
          onSample: (ms) => patch({ live: ms, prog: (++n / 10) * P_PING }),
        }).catch((e) => {
          if (signal.aborted) throw e
          throw new Error("Could not reach the test server", { cause: e })
        })
        patch({ ping: latency.ping, jitter: latency.jitter })

        // 2. Download
        patch({ phase: "download", live: 0, prog: P_PING })
        const dlS: Sample[] = []
        const dl = await runDownload({
          seconds: TEST_SECONDS,
          signal,
          onSample: (s) => {
            dlS.push(s)
            patch({ live: s.mbps, dlS: dlS.slice(), prog: P_PING + Math.min(s.t / TEST_SECONDS, 1) * P_DL })
          },
        })
        patch({ dl })

        // 3. Upload
        patch({ phase: "upload", live: 0, prog: P_PING + P_DL })
        const ulS: Sample[] = []
        const ul = await runUpload({
          seconds: TEST_SECONDS,
          signal,
          onSample: (s) => {
            ulS.push(s)
            patch({ live: s.mbps, ulS: ulS.slice(), prog: P_PING + P_DL + Math.min(s.t / TEST_SECONDS, 1) * (1 - P_PING - P_DL) })
          },
        })

        const run: SavedRun = {
          id: "r" + Date.now(),
          at: new Date().toISOString(),
          dl,
          ul,
          ping: latency.ping,
          jitter: latency.jitter,
          serverName,
          serverPlace,
          provider,
          network: detectNetwork(),
          dlS: downsample(dlS),
          ulS: downsample(ulS),
        }
        addRun(run)
        patch({ phase: "done", ul, live: 0, prog: 1, activeRun: run.id })
        toast("Test complete")
      } catch (e) {
        if (signal.aborted) return
        const msg = e instanceof Error ? e.message : "The test failed"
        setState((st) => ({ ...st, phase: "idle", ...RESET, error: msg }))
        toast.error(msg)
      }
    },
    [provider, serverName, serverPlace],
  )

  const cancel = useCallback(() => {
    abort.current?.abort()
    setState((st) => ({ ...st, phase: "idle", ...RESET }))
    toast("Test stopped")
  }, [])

  const loadRun = useCallback((r: SavedRun) => {
    setState((st) => ({
      ...st,
      phase: "done",
      ...RESET,
      dl: r.dl,
      ul: r.ul,
      ping: r.ping,
      jitter: r.jitter,
      dlS: r.dlS,
      ulS: r.ulS,
      prog: 1,
      activeRun: r.id,
    }))
  }, [])

  const running = state.phase === "ping" || state.phase === "download" || state.phase === "upload"

  return { ...state, running, done: state.phase === "done", start, cancel, loadRun }
}
