import { test as base, expect, type Page, type Route } from "@playwright/test"

/** What the mocked Cloudflare `/meta` endpoint reports about the visitor. */
export const META = {
  clientIp: "203.0.113.42",
  asOrganization: "Example Broadband",
  asn: 64500,
  city: "Testville",
  region: "Test Region",
  country: "IN",
  colo: { iata: "TST", city: "Mockcity", cca2: "IN" },
}

/** TCP round trip the mock reports for each latency probe, in ms. */
export const MOCK_RTT_MS = 12

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "server-timing, content-length",
}

const DOWN_CHUNK = Buffer.alloc(512 * 1024)

type MockOptions = {
  /** Make `/meta` fail, as if Cloudflare were blocked. */
  metaFails?: boolean
  /** Make every latency probe fail. */
  latencyFails?: boolean
  /** Make every upload request fail. */
  uploadFails?: boolean
}

export type CloudflareMock = {
  /** Requests the page sent to speed.cloudflare.com, as "METHOD /path". */
  requests: string[]
  /** CORS preflights seen. Uploads must not trigger any (Safari rejected them). */
  preflights: () => number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Stands in for speed.cloudflare.com so tests are fast, offline and deterministic,
 * and never send the tester's IP anywhere.
 */
export async function mockCloudflare(page: Page, opts: MockOptions = {}): Promise<CloudflareMock> {
  const requests: string[] = []
  await page.route(
    (url) => url.hostname === "speed.cloudflare.com",
    async (route: Route) => {
      const req = route.request()
      const url = new URL(req.url())
      requests.push(`${req.method()} ${url.pathname}`)

      if (req.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: { ...CORS, "access-control-allow-methods": "GET, POST" } })
      }
      if (url.pathname === "/meta") {
        if (opts.metaFails) return route.abort("connectionrefused")
        return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(META) })
      }
      if (url.pathname === "/__down") {
        if (url.searchParams.get("bytes") === "0") {
          if (opts.latencyFails) return route.abort("connectionrefused")
          return route.fulfill({
            status: 200,
            headers: { ...CORS, "server-timing": `cfL4;desc="?proto=TCP&rtt=${MOCK_RTT_MS * 1000}&min_rtt=${MOCK_RTT_MS * 1000}"` },
            body: "",
          })
        }
        // Slow enough that the 4 streams stay a few hundred requests, not thousands.
        await sleep(100)
        return route.fulfill({ status: 200, headers: CORS, body: DOWN_CHUNK }).catch(() => {})
      }
      if (url.pathname === "/__up") {
        if (opts.uploadFails) return route.abort("connectionrefused")
        // Over 300 ms keeps the client's adaptive chunk at 256 KB instead of growing to 8 MB.
        await sleep(350)
        return route.fulfill({ status: 200, headers: CORS, body: "" }).catch(() => {})
      }
      return route.fulfill({ status: 404, headers: CORS, body: "" })
    },
  )
  return { requests, preflights: () => requests.filter((r) => r.startsWith("OPTIONS")).length }
}

type Fixtures = { cloudflare: CloudflareMock }

/** `test` with Cloudflare mocked. Each test gets a fresh browser context, so storage starts empty. */
export const test = base.extend<Fixtures>({
  cloudflare: [
    async ({ page }, use) => {
      await use(await mockCloudflare(page))
    },
    { auto: true },
  ],
})

export { expect }

/** Runs a full speed test from the home page and waits for the result. */
export async function runTest(page: Page) {
  await page.getByRole("button", { name: /start test/i }).click()
  await expect(page.getByText("Result", { exact: true })).toBeVisible({ timeout: 20_000 })
}
