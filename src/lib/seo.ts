// Per-page titles and descriptions. Used at runtime (document head) and at build time, where
// vite.config.ts writes a static HTML file per page so crawlers get the right tags and a 200.

export const SITE_URL = "https://pulse.codespanda.com"
export const SITE_NAME = "Pulse"

export type PageMeta = {
  path: string
  title: string
  description: string
  /** Keep out of search results (personal or utility pages). */
  noindex?: boolean
}

export const PAGES: PageMeta[] = [
  {
    path: "/",
    title: "Pulse — Internet speed test",
    description:
      "Test your internet speed in seconds: download, upload, latency and jitter against your nearest Cloudflare server. No account, and results stay on your device.",
  },
  {
    path: "/methodology",
    title: "How the speed test works — Pulse",
    description:
      "How Pulse measures latency, jitter, download and upload speed against Cloudflare, and what the live numbers and ratings mean.",
  },
  {
    path: "/privacy",
    title: "Privacy — Pulse",
    description:
      "What Pulse shares with Cloudflare during a speed test, what stays on your device, and how to clear your saved results.",
  },
  {
    path: "/help",
    title: "Help and FAQ — Pulse",
    description:
      "Why your speed test result is lower than your plan, why results vary, VPN effects, data usage and fixes for failed tests.",
  },
  {
    path: "/result",
    title: "Your latest result — Pulse",
    description: "Your most recent Pulse speed test result.",
    noindex: true,
  },
]

export const pageMeta = (path: string): PageMeta => PAGES.find((p) => p.path === path) ?? PAGES[0]

export const canonicalUrl = (path: string) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`)
