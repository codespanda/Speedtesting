import { useCallback, useEffect, useRef, useState } from "react"

import { fetchMeta, type Meta } from "@/lib/cloudflare"

type Status = "loading" | "ready" | "error"

/** The visitor's ISP and location, and the Cloudflare data center the test will use. */
export function useConnection() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setStatus("loading")
    setError(null)
    try {
      setMeta(await fetchMeta(ctrl.signal))
      setStatus("ready")
    } catch (e) {
      if (ctrl.signal.aborted) return
      setStatus("error")
      setError(e instanceof Error ? e.message : "Could not reach the test server")
    }
  }, [])

  useEffect(() => {
    refresh()
    return () => abort.current?.abort()
  }, [refresh])

  return { meta, status, error, refresh }
}
