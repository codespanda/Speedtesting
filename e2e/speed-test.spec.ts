import { expect, META, MOCK_RTT_MS, runTest, test } from "./fixtures"

test.describe("speed test", () => {
  test("shows the connection details from Cloudflare", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "Check your connection" })).toBeVisible()

    const conn = page.getByRole("region", { name: "Your connection" })
    await expect(conn).toContainText(META.asOrganization)
    await expect(conn).toContainText(META.clientIp)
    await expect(conn).toContainText("Testville, India")
    await expect(conn).toContainText(`Cloudflare ${META.colo.iata} · Mockcity, India`)

    const panel = page.getByRole("region", { name: "Speed test" })
    await expect(panel).toContainText("Ready")
    await expect(panel).toContainText(META.colo.city)
  })

  test("runs latency, download and upload, then shows the result", async ({ page, cloudflare }) => {
    await page.goto("/")
    await runTest(page)

    const cards = page.getByRole("region", { name: "Results" })
    const download = cards.getByRole("button", { name: /download/i })
    const upload = cards.getByRole("button", { name: /upload/i })
    const latency = cards.getByRole("button", { name: /latency/i })
    await expect(download).toContainText(/\d+(\.\d+)?\s*Mbps/)
    await expect(upload).toContainText(/\d+(\.\d+)?\s*Mbps/)
    await expect(latency).toContainText(`${MOCK_RTT_MS}`)
    await expect(download).not.toContainText("Not measured yet")

    await expect(page.getByText("Test complete")).toBeVisible()
    await expect(page.getByRole("button", { name: /run again/i })).toBeVisible()
    await expect(page.getByRole("region", { name: "What this means" })).not.toContainText("Run a test")

    // Regression test for the iPhone bug: uploads must be simple requests with no CORS preflight.
    expect(cloudflare.requests.some((r) => r === "POST /__up")).toBe(true)
    expect(cloudflare.preflights()).toBe(0)
  })

  test("saves the run and keeps it after a reload", async ({ page }) => {
    await page.goto("/")
    const recent = page.getByRole("region", { name: "Recent runs" })
    await expect(recent).toContainText("Your tests will appear here")

    await runTest(page)
    await expect(recent.getByRole("button")).toHaveCount(1)

    await page.reload()
    await expect(recent.getByRole("button")).toHaveCount(1)
    await expect(recent).toContainText("Mockcity")

    // Selecting a saved run shows its result again.
    await recent.getByRole("button").first().click()
    await expect(page.getByText("Result", { exact: true })).toBeVisible()
  })

  test("Stop cancels a running test", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /start test/i }).click()
    const stop = page.getByRole("button", { name: /stop/i })
    await expect(stop).toBeVisible()
    await stop.click()

    await expect(page.getByText("Test stopped")).toBeVisible()
    await expect(page.getByRole("region", { name: "Speed test" })).toContainText("Ready")
    await expect(page.getByRole("button", { name: /start test/i })).toBeVisible()
    await expect(page.getByRole("region", { name: "Recent runs" }).getByRole("button")).toHaveCount(0)
  })

  test("devices slider changes the per-device requirement", async ({ page }) => {
    await page.goto("/")
    const usage = page.getByRole("region", { name: "What this means" })
    await expect(usage).toContainText("each on 3 devices")

    const slider = page.getByRole("slider", { name: "Devices at home" })
    await slider.focus()
    await page.keyboard.press("ArrowRight")
    await expect(usage).toContainText("each on 4 devices")

    await page.keyboard.press("Home")
    await expect(usage).toContainText("25 Mbps down")
    await expect(usage).not.toContainText("each on")
  })
})
