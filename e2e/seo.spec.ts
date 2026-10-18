import { PAGES, SITE_URL, canonicalUrl } from "../src/lib/seo"
import { expect, test } from "./fixtures"

const attr = (html: string, re: RegExp) => html.match(re)?.[1]

// Static files only exist in the production build: run with npm run test:e2e:prod.
test.describe("static HTML for crawlers", () => {
  test.beforeEach(async ({ request }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "server output is the same for every browser")
    // The dev server answers every path with the app page, so look for a real XML sitemap.
    const sitemap = await (await request.get("/sitemap.xml")).text()
    test.skip(!sitemap.startsWith("<?xml"), "dev server has no static pages; run npm run test:e2e:prod")
  })

  for (const page of PAGES) {
    test(`${page.path} has its own title, description and canonical URL`, async ({ request }) => {
      const file = page.path === "/" ? "/" : `${page.path}.html`
      const res = await request.get(file)
      expect(res.status()).toBe(200)
      const html = await res.text()

      expect(html.indexOf('<meta charset="UTF-8"')).toBeLessThan(html.indexOf("<meta http-equiv"))
      expect(attr(html, /<title>([^<]*)<\/title>/)).toBe(page.title)
      expect(attr(html, /<meta name="description" content="([^"]*)"/)).toBe(page.description)
      expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe(canonicalUrl(page.path))
      expect(attr(html, /<meta property="og:url" content="([^"]*)"/)).toBe(canonicalUrl(page.path))
      expect(attr(html, /<meta name="robots" content="([^"]*)"/)).toBe(page.noindex ? "noindex, follow" : "index, follow")
      expect(html).not.toContain("{{")
      // Search snippets get cut off around 160 characters.
      expect(page.description.length).toBeLessThanOrEqual(170)
    })
  }

  test("404 page stays out of search results", async ({ request }) => {
    const html = await (await request.get("/404.html")).text()
    expect(attr(html, /<meta name="robots" content="([^"]*)"/)).toBe("noindex, follow")
  })

  test("sitemap lists every indexable page and robots.txt points to it", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text()
    for (const p of PAGES) {
      const listed = sitemap.includes(`<loc>${canonicalUrl(p.path)}</loc>`)
      expect(listed, p.path).toBe(!p.noindex)
    }
    const robots = await (await request.get("/robots.txt")).text()
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
    expect(robots).toContain("Allow: /")
  })

  test("social image, icons and manifest exist", async ({ request }) => {
    const html = await (await request.get("/")).text()
    expect(attr(html, /<meta property="og:image" content="([^"]*)"/)).toBe(`${SITE_URL}/og-image.png`)
    for (const file of ["/og-image.png", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png"]) {
      const res = await request.get(file)
      expect(res.status(), file).toBe(200)
      expect(res.headers()["content-type"], file).toContain("image/png")
    }
    const manifest = await (await request.get("/manifest.webmanifest")).json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]))

    const ld = JSON.parse(attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/) ?? "{}")
    expect(ld["@type"]).toBe("WebApplication")
    expect(ld.url).toBe(`${SITE_URL}/`)
  })
})

test.describe("page metadata while navigating", () => {
  test("title, description and canonical follow the current page", async ({ page }) => {
    await page.goto("/")
    const home = PAGES[0]
    await expect(page).toHaveTitle(home.title)

    for (const target of PAGES.filter((p) => !p.noindex && p.path !== "/")) {
      await page.getByRole("contentinfo").getByRole("link", { name: new RegExp(`^${target.path.slice(1)}$`, "i") }).click()
      await expect(page).toHaveTitle(target.title)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", target.description)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalUrl(target.path))
      await page.goBack()
      await expect(page).toHaveTitle(home.title)
    }
  })

  test("the personal result page is noindex", async ({ page }) => {
    await page.goto("/result")
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow")
    await page.getByRole("link", { name: /start test/i }).click()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow")
  })

  test("every page has exactly one h1", async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p.path)
      await page.waitForLoadState("networkidle")
      await expect(page.locator("h1"), p.path).toHaveCount(1)
    }
  })
})
