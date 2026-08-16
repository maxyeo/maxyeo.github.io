#!/usr/bin/env node
// GitHub Pages has no server-side rewrite rule. static/404.html bounces a
// deep link like /stills into the app client-side, which is fine for a
// browser but not for a no-JS crawler — and static/sitemap.xml (see #18)
// hands crawlers /stills and /about directly, as URLs, with no link graph
// to fall back on. The wire response for those URLs was a 404, not a 200,
// which is issue #29.
//
// This script runs after `vite build` and turns /stills/ and /about/ into
// real files with real rendered content: dist/stills/index.html and
// dist/about/index.html. GitHub Pages serves a directory's index.html for
// that directory's URL with no rewrite needed, so these are genuine 200s.
//
// "/" is deliberately not pre-rendered here — see PRERENDER_ROUTES in
// src/routes-meta.ts and the README/PR notes for why: it's the 404.html
// bounce target, and pre-rendering it would need its own guard against
// painting the wrong route for a frame during that bounce.
//
// Mechanism: boot Vite in middleware mode against the already-built dist/,
// load src/entry-server.tsx through ssrLoadModule (a real module graph, so
// .tsx/.css-side-effect/resolveJsonModule/import.meta.env all resolve the
// same way they do for `vite build`), and clone dist/index.html per route so
// every pre-rendered page inherits the exact same hashed asset URLs, GA
// snippet, font preload and sessionStorage bounce receiver that the client
// build already produced — they can never drift out of sync.
//
// Usage (run automatically as the third step of `npm run build`):
//   node scripts/prerender.mjs

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createServer } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // portfolio24/scripts
const ROOT = path.resolve(HERE, '..'); // portfolio24/
const DIST = path.resolve(ROOT, '..', 'dist');

// Depends on vite.config.ts's `base` staying the default '/': a relative
// base would emit `./assets/...` in dist/index.html, which resolves
// correctly from / but wrong from a nested path like /stills/. If base ever
// changes, the asset URLs cloned into the pre-rendered pages below would
// need to become path-aware.
const ORIGIN = 'https://maxwellyeo.com';

// Replaces exactly one occurrence of `pattern` in `html`, throwing (naming
// `label`) if the match count isn't exactly 1. This is the guard against the
// "build succeeds, page is 200, but the canonical tag silently still points
// at the homepage" failure mode — a head tag going missing or duplicating
// fails the build instead of shipping quietly.
function replaceOnce(html, pattern, replacement, label) {
  const matches = html.match(pattern);
  const count = matches ? matches.length : 0;
  if (count !== 1) {
    throw new Error(
      `expected exactly 1 match for ${label}, found ${count}`,
    );
  }
  return html.replace(pattern, replacement);
}

// Escapes a string for safe interpolation into an HTML attribute value.
function escapeAttr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPage(template, { canonicalPath, title, description }, appHtml) {
  const url = `${ORIGIN}${canonicalPath}`;
  const escapedTitle = escapeAttr(title);
  const escapedDescription = escapeAttr(description);
  const escapedUrl = escapeAttr(url);

  let html = template;

  html = replaceOnce(
    html,
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`,
    '<div id="root">',
  );

  html = replaceOnce(
    html,
    /<title>[^<]*<\/title>/,
    `<title>${escapedTitle}</title>`,
    '<title>',
  );

  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapedDescription}">`,
    'meta[name="description"]',
  );

  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapedUrl}" />`,
    'link[rel="canonical"]',
  );

  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*"\/>/,
    `<meta property="og:title" content="${escapedTitle}"/>`,
    'meta[property="og:title"]',
  );

  html = replaceOnce(
    html,
    /<meta property="og:url" content="[^"]*"\/>/,
    `<meta property="og:url" content="${escapedUrl}"/>`,
    'meta[property="og:url"]',
  );

  html = replaceOnce(
    html,
    /<meta property="og:description" content="[^"]*"\/>/,
    `<meta property="og:description" content="${escapedDescription}"/>`,
    'meta[property="og:description"]',
  );

  html = replaceOnce(
    html,
    /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${escapedTitle}">`,
    'meta[name="twitter:title"]',
  );

  html = replaceOnce(
    html,
    /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${escapedDescription}">`,
    'meta[name="twitter:description"]',
  );

  return html;
}

// Every <loc> in dist/sitemap.xml (copied verbatim from static/ by Vite's
// publicDir) must be exactly the set of ORIGIN + canonicalPath for every
// route in routes-meta.ts's ROUTES — this is what makes "a route exists but
// isn't in the sitemap" or "the sitemap advertises a URL the app doesn't
// have" structurally impossible to reintroduce.
async function assertSitemapMatchesRoutes(routes) {
  const sitemapPath = path.join(DIST, 'sitemap.xml');
  const sitemapXml = await fs.readFile(sitemapPath, 'utf8');
  const found = new Set([...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]));
  const expected = new Set(routes.map((r) => `${ORIGIN}${r.canonicalPath}`));

  const missing = [...expected].filter((url) => !found.has(url));
  const extra = [...found].filter((url) => !expected.has(url));

  if (missing.length > 0 || extra.length > 0) {
    const lines = [`static/sitemap.xml (dist/sitemap.xml) does not match src/routes-meta.ts's ROUTES.`];
    if (missing.length > 0) lines.push(`  missing from sitemap: ${missing.join(', ')}`);
    if (extra.length > 0) lines.push(`  in sitemap but not a route: ${extra.join(', ')}`);
    throw new Error(lines.join('\n'));
  }
}

async function main() {
  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');

  const server = await createServer({
    root: ROOT,
    mode: 'production', // load-bearing: see the comment on getImageDimensions
    appType: 'custom',
    logLevel: 'warn',
    server: {
      middlewareMode: true,
      watch: null, // don't let a chokidar watcher keep the process alive
    },
  });

  try {
    const { render, getPrerenderRoutes } = await server.ssrLoadModule('/src/entry-server.tsx');
    const PRERENDER_ROUTES = getPrerenderRoutes();

    await assertSitemapMatchesRoutes([{ canonicalPath: '/' }, ...PRERENDER_ROUTES]);

    for (const route of PRERENDER_ROUTES) {
      const appHtml = render(route.canonicalPath);
      const html = renderPage(template, route, appHtml);

      // route.canonicalPath is '/stills/' or '/about/' -> segment 'stills'/'about'
      const segment = route.canonicalPath.replace(/^\/|\/$/g, '');
      const outDir = path.join(DIST, segment);
      const outFile = path.join(outDir, 'index.html');

      // If this already exists, either two routes collided on the same
      // segment or static/ has grown a real directory of the same name
      // (static/socials/, static/zohoverify/ exist today; stills/about do
      // not) — either way, clobbering it silently would be a bug, not a
      // feature.
      if (await fileExists(outFile)) {
        throw new Error(`refusing to overwrite existing file: ${path.relative(DIST, outFile)}`);
      }

      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(outFile, html);

      const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
      console.log(`prerendered ${path.relative(path.resolve(DIST, '..'), outFile)} (${kb} kB)`);
    }
  } finally {
    await server.close();
  }
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exitCode = 1;
});
