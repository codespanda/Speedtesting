import { expect, runTest, test } from "./fixtures"

const ROUTES = ["/", "/methodology", "/privacy", "/help", "/result"]
const WIDTHS = [320, 375, 768, 1024, 1440]

/**
 * Elements sticking out past the right edge of the viewport (the cause of sideways scrolling).
 * The toast layer is fixed-position and can't cause scrolling, so it is checked separately.
 */
async function overflowing(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const scroll = document.documentElement.scrollWidth > vw ? [`page scrolls sideways (${document.documentElement.scrollWidth}px)`] : []
    return scroll.concat(
      [...document.querySelectorAll("body *")]
      .filter((e) => !e.closest("[data-sonner-toaster]") && e.getBoundingClientRect().right > vw + 1)
      .map((e) => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className).slice(0, 60)}`)
      .slice(0, 5),
    )
  })
}

// Width sweep runs once, on desktop Chrome; the phone projects check their own screen size below.
test.describe("no sideways scrolling", () => {
  for (const width of WIDTHS) {
    test(`at ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-chrome", "width sweep runs on desktop Chrome only")
      await page.setViewportSize({ width, height: 900 })
      for (const route of ROUTES) {
        await page.goto(route)
        await page.waitForLoadState("networkidle")
        expect(await overflowing(page), `${route} at ${width}px`).toEqual([])
      }
    })
  }

  test("on this device after a full test", async ({ page }) => {
    await page.goto("/")
    await runTest(page)
    expect(await overflowing(page)).toEqual([])

    // The "Test complete" toast itself must fit on screen.
    const toast = await page.locator("[data-sonner-toast]").first().boundingBox()
    const vw = page.viewportSize()!.width
    expect(toast).not.toBeNull()
    expect(toast!.x).toBeGreaterThanOrEqual(0)
    expect(toast!.x + toast!.width).toBeLessThanOrEqual(vw + 1)
  })
})

test.describe("layout breakpoints", () => {
  test("metric cards are two per row on phones and four on wide screens", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "viewport sizes are set explicitly here")
    const rowsOf = async () =>
      page.getByRole("region", { name: "Results" }).evaluate((el) => {
        const tops = [...el.children].map((c) => Math.round(c.getBoundingClientRect().top))
        return new Set(tops).size
      })

    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto("/")
    expect(await rowsOf()).toBe(2)

    await page.setViewportSize({ width: 1280, height: 900 })
    expect(await rowsOf()).toBe(1)
  })

  test("chart labels stay readable on narrow screens", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "viewport sizes are set explicitly here")
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto("/")
    const label = page.getByRole("img", { name: /line chart/i }).locator("text").first()
    const box = await label.boundingBox()
    // 11px labels must not get scaled down with the chart.
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(10)
  })
})

test.describe("mobile result screen", () => {
  test("is empty before any test", async ({ page }) => {
    await page.goto("/result")
    await expect(page.getByText("No results yet")).toBeVisible()
    await page.getByRole("link", { name: /start test/i }).click()
    await expect(page.getByRole("heading", { name: "Check your connection" })).toBeVisible()
  })

  test("shows the latest saved run", async ({ page }) => {
    await page.goto("/")
    await runTest(page)
    await page.goto("/result")
    await expect(page.getByText(/^Done · \d\d:\d\d$/)).toBeVisible()
    await expect(page.getByText("Example Broadband")).toBeVisible()
    await expect(page.getByText("Good for")).toBeVisible()
  })
})
