import { expect, test } from "./fixtures"

const INFO_PAGES = [
  { link: "Methodology", path: "/methodology", heading: "Methodology", text: "Latency" },
  { link: "Privacy", path: "/privacy", heading: "Privacy", text: "What Cloudflare sees" },
  { link: "Help", path: "/help", heading: "Help", text: "Why is my result lower than my plan?" },
]

test("top bar shows only the logo and theme toggle", async ({ page }) => {
  await page.goto("/")
  const header = page.locator("header")
  await expect(header.getByRole("link")).toHaveCount(1)
  await expect(header.getByRole("link")).toHaveText("Pulse")
  await expect(header.getByRole("button", { name: /switch to (dark|light) theme/i })).toBeVisible()
  for (const { link } of INFO_PAGES) await expect(header.getByRole("link", { name: link })).toHaveCount(0)
})

for (const p of INFO_PAGES) {
  test(`footer link opens ${p.heading}`, async ({ page }) => {
    await page.goto("/")
    await page.getByRole("contentinfo").getByRole("link", { name: p.link }).click()
    await expect(page).toHaveURL(p.path)
    await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible()
    await expect(page.getByText(p.text).first()).toBeVisible()

    // "Start a test" and the logo both lead back to the test page.
    await page.getByRole("link", { name: /start a test/i }).click()
    await expect(page.getByRole("heading", { name: "Check your connection" })).toBeVisible()
  })

  test(`${p.path} loads when opened directly`, async ({ page }) => {
    await page.goto(p.path)
    await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible()
  })
}

test("removed and unknown pages redirect to the test page", async ({ page }) => {
  for (const path of ["/history", "/how-it-works", "/does-not-exist"]) {
    await page.goto(path)
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { name: "Check your connection" })).toBeVisible()
  }
})

test("theme toggle switches to dark and remembers it", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("html")).not.toHaveClass(/dark/)

  await page.getByRole("button", { name: "Switch to dark theme" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.getByRole("button", { name: "Switch to light theme" }).click()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
})
