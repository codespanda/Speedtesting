import { useEffect } from "react"
import { useLocation } from "react-router-dom"

import { canonicalUrl, pageMeta } from "@/lib/seo"

function setTag(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.append(el)
  }
  el.setAttribute(attr, value)
}

const meta = (key: "name" | "property", name: string) => () => {
  const el = document.createElement("meta")
  el.setAttribute(key, name)
  return el
}

/**
 * Keeps the title, description, canonical link and social tags in sync with the current page
 * when navigating inside the app. The static HTML for each page already has the same values.
 */
export function usePageMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const m = pageMeta(pathname)
    const url = canonicalUrl(m.path)
    document.title = m.title
    setTag('meta[name="description"]', meta("name", "description"), "content", m.description)
    setTag('meta[property="og:title"]', meta("property", "og:title"), "content", m.title)
    setTag('meta[property="og:description"]', meta("property", "og:description"), "content", m.description)
    setTag('meta[property="og:url"]', meta("property", "og:url"), "content", url)
    setTag('meta[name="robots"]', meta("name", "robots"), "content", m.noindex ? "noindex, follow" : "index, follow")
    setTag(
      'link[rel="canonical"]',
      () => {
        const el = document.createElement("link")
        el.rel = "canonical"
        return el
      },
      "href",
      url,
    )
  }, [pathname])
}
