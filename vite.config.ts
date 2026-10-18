import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Content-Security-Policy for production builds. GitHub Pages can't send custom headers, so it
 * goes in a <meta> tag (which means frame-ancestors can't be set). Dev builds skip it because the
 * Vite dev server relies on inline scripts for hot reload.
 * - connect-src: the speed test only talks to Cloudflare's speed endpoints.
 * - style-src 'unsafe-inline': the toast library injects a <style> tag at runtime.
 * - font-src data:: small font subsets may be inlined as data: URLs.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://speed.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Served from the root of the custom domain (public/CNAME). Set BASE_PATH=/<repo>/ to host under <user>.github.io/<repo>/ instead.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
