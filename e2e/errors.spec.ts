import { expect, mockCloudflare, test } from "./fixtures"

// Routes added later take priority, so each test's mock overrides the default one.
test.describe("when Cloudflare is unreachable", () => {
  test("shows the error and offers Try again", async ({ page }) => {
    await mockCloudflare(page, { metaFails: true })
    await page.goto("/")

    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible()
    const conn = page.getByRole("region", { name: "Your connection" })
    await expect(conn).toContainText("Unavailable")
  })

  test("recovers when Try again succeeds", async ({ page }) => {
    await mockCloudflare(page, { metaFails: true })
    await page.goto("/")
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible()

    // Restore a working Cloudflare and retry.
    await page.unrouteAll({ behavior: "ignoreErrors" })
    await mockCloudflare(page)
    await page.getByRole("button", { name: /try again/i }).click()
    await expect(page.getByRole("button", { name: /start test/i })).toBeEnabled()
    await expect(page.getByRole("region", { name: "Your connection" })).toContainText("Example Broadband")
  })
})

test.describe("when a test step fails", () => {
  test("latency failure ends the test with a message", async ({ page }) => {
    await mockCloudflare(page, { latencyFails: true })
    await page.goto("/")
    await page.getByRole("button", { name: /start test/i }).click()

    await expect(page.getByRole("region", { name: "Speed test" })).toContainText("Could not reach the test server")
    await expect(page.getByRole("button", { name: /start test/i })).toBeVisible()
    await expect(page.getByRole("region", { name: "Recent runs" }).getByRole("button")).toHaveCount(0)
  })

  test("upload failure ends the test without saving a result", async ({ page }) => {
    await mockCloudflare(page, { uploadFails: true })
    await page.goto("/")
    await page.getByRole("button", { name: /start test/i }).click()

    await expect(page.getByRole("button", { name: /start test/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText("Result", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Recent runs" }).getByRole("button")).toHaveCount(0)
  })
})
