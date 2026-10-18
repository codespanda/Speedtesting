import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

import { canonicalUrl, PAGES, SITE_URL, type PageMeta } from './src/lib/seo.ts'

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

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Fills the {{PAGE_*}} markers in index.html for one page. */
function fillPage(template: string, page: PageMeta) {
  return template
    .replaceAll('{{PAGE_TITLE}}', escapeAttr(page.title))
    .replaceAll('{{PAGE_DESCRIPTION}}', escapeAttr(page.description))
    .replaceAll('{{PAGE_URL}}', canonicalUrl(page.path))
    .replaceAll('{{PAGE_ROBOTS}}', page.noindex ? 'noindex, follow' : 'index, follow')
    .replaceAll('{{SITE_URL}}', SITE_URL)
}

/**
 * Search-engine support for a single-page app on GitHub Pages:
 * - Writes dist/<page>.html for every page, each with its own title, description and canonical
 *   URL. GitHub Pages serves /privacy from privacy.html with a 200 (a privacy/ folder would
 *   redirect to /privacy/ first), so crawlers no longer get the 404 fallback.
 * - Writes 404.html (noindex) for unknown addresses, plus sitemap.xml and robots.txt.
 * - Adds the Content-Security-Policy right after <meta charset>, which must stay first in <head>.
 */
function seoPages(): Plugin {
  let template = ''
  let outDir = 'dist'
  let isBuild = false
  return {
    name: 'seo-pages',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
      isBuild = config.command === 'build'
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (isBuild) html = html.replace(/(<meta charset="UTF-8" \/>)/, `$1\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
        template = html
        return fillPage(html, PAGES[0])
      },
    },
    async writeBundle() {
      for (const page of PAGES.filter((p) => p.path !== '/')) {
        const file = path.join(outDir, `${page.path.slice(1)}.html`)
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, fillPage(template, page))
      }
      // Unknown addresses: the app redirects them home; keep the page itself out of search results.
      await writeFile(
        path.join(outDir, '404.html'),
        fillPage(template, { path: '/', title: 'Page not found — Pulse', description: PAGES[0].description, noindex: true }),
      )
      const indexable = PAGES.filter((p) => !p.noindex)
      await writeFile(
        path.join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
          .map((p) => `  <url><loc>${canonicalUrl(p.path)}</loc></url>`)
          .join('\n')}\n</urlset>\n`,
      )
      await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Served from the root of the custom domain (public/CNAME). Set BASE_PATH=/<repo>/ to host under <user>.github.io/<repo>/ instead.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), seoPages()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
