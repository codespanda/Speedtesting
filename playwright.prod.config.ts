import { defineConfig } from "@playwright/test"

import base from "./playwright.config"

const PORT = 4174

/**
 * Same tests, run against the production build served by `vite preview`, so the
 * Content-Security-Policy and minified bundle are what get tested. CI uses this config.
 */
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    // Shorter download/upload phases keep each full test run to a few seconds.
    env: { VITE_TEST_SECONDS: "2" },
  },
})
