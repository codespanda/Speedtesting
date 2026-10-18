// Renders the social preview card and app icons into public/ with Playwright.
// Run after changing the brand look:  node scripts/generate-images.mjs
import { chromium } from "@playwright/test"
import { fileURLToPath } from "node:url"

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url))
const PULSE = "M2 12h4l2.5-6 4 12 3-9 2 3H22"

const icon = (size, radius) => `
  <body style="margin:0">
    <div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:#1976d2;display:flex;align-items:center;justify-content:center">
      <svg width="${size * 0.62}" height="${size * 0.62}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${PULSE}"/></svg>
    </div>
  </body>`

const card = `
  <body style="margin:0">
    <div style="width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;background:linear-gradient(135deg,#1565c0 0%,#1976d2 55%,#42a5f5 100%);color:#fff;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:column;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:20px">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${PULSE}"/></svg>
        <span style="font-size:48px;font-weight:600;letter-spacing:.5px">Pulse</span>
      </div>
      <div>
        <div style="font-size:76px;font-weight:600;line-height:1.05;letter-spacing:-1px">Internet speed test</div>
        <div style="margin-top:22px;font-size:34px;opacity:.9">Download · Upload · Latency · Jitter</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:26px;opacity:.9">
        <span>No account. Results stay on your device.</span>
        <span>pulse.codespanda.com</span>
      </div>
    </div>
  </body>`

const outputs = [
  { file: "og-image.png", html: card, width: 1200, height: 630 },
  { file: "apple-touch-icon.png", html: icon(180, 0), width: 180, height: 180 },
  { file: "icon-192.png", html: icon(192, 0), width: 192, height: 192 },
  { file: "icon-512.png", html: icon(512, 0), width: 512, height: 512 },
]

const browser = await chromium.launch()
for (const o of outputs) {
  const page = await browser.newPage({ viewport: { width: o.width, height: o.height } })
  await page.setContent(o.html)
  await page.screenshot({ path: PUBLIC + o.file, clip: { x: 0, y: 0, width: o.width, height: o.height } })
  await page.close()
  console.log("wrote public/" + o.file)
}
await browser.close()
