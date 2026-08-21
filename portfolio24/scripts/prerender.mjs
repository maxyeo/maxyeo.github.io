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
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // portfolio24/scripts
const ROOT = path.resolve(HERE, '..'); // portfolio24/
const DIST = path.resolve(ROOT, '..', 'dist');
const STATIC = path.resolve(ROOT, '..', 'static'); // vite's publicDir

// Depends on vite.config.ts's `base` staying the default '/': a relative
// base would emit `./assets/...` in dist/index.html, which resolves
// correctly from / but wrong from a nested path like /stills/. If base ever
// changes, the asset URLs cloned into the pre-rendered pages below would
// need to become path-aware.
const ORIGIN = 'https://maxwellyeo.com';

// Counts every occurrence of `pattern` in `html`. `pattern` may be a plain
// string (indexOf-scanned) or a RegExp (matched with a forced 'g' flag via
// matchAll, on a clone so the caller's own pattern — used un-cloned for the
// actual replace below — is never mutated).
//
// NOT `html.match(pattern)`: with a non-global RegExp, String#match returns
// only the *first* match (plus any capture groups), so its .length reflects
// the capture-group count, not the number of occurrences in the document —
// it's 1 whether the tag appears once or five times, and only null at zero
// occurrences. That silently defeats the "exactly 1 match" check below.
function countOccurrences(html, pattern) {
  if (typeof pattern === 'string') {
    if (pattern.length === 0) return 0;
    let count = 0;
    let fromIndex = 0;
    for (;;) {
      const found = html.indexOf(pattern, fromIndex);
      if (found === -1) return count;
      count += 1;
      fromIndex = found + pattern.length;
    }
  }
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return [...html.matchAll(new RegExp(pattern.source, flags))].length;
}

// Replaces exactly one occurrence of `pattern` in `html`, throwing (naming
// `label`) if the match count isn't exactly 1. This is the guard against the
// "build succeeds, page is 200, but the canonical tag silently still points
// at the homepage" failure mode — a head tag going missing or duplicating
// fails the build instead of shipping quietly.
function replaceOnce(html, pattern, replacement, label) {
  const count = countOccurrences(html, pattern);
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

// The date to stamp into every <lastmod>, as YYYY-MM-DD: the HEAD commit's
// committer date in UTC. Deployment only ever builds a clean CI checkout of
// main (see .github/workflows/deploy-pages.yml), so that is the date the
// deployed bytes were last changed.
//
// Deliberately *not* "today": today's date would move on every rebuild of an
// unchanged commit, telling crawlers the whole site changed daily, and
// consistently inaccurate lastmod values are the documented way to get
// lastmod ignored altogether. Deliberately not per-route either — this is a
// three-page site whose pages share App.tsx, index.css and routes-meta.ts,
// so a per-route git log would report the shared-file date for all three
// most of the time anyway, at the cost of a route -> source-path map that
// could itself drift.
function headCommitDate() {
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%cd', '--date=format-local:%Y-%m-%d'],
      {
        cwd: ROOT,
        // format-local reads TZ; pinning it keeps the stamp identical no
        // matter which machine or CI runner produced the build.
        env: { ...process.env, TZ: 'UTC' },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    // No git binary, or not a repository (a source tarball, say).
    return null;
  }
}

// Blanks out XML comments so the scans below read content only.
// static/sitemap.xml's header comment talks about <loc> and <lastmod> by
// name, and prose about a tag must never be mistaken for the tag.
function stripXmlComments(xml) {
  return xml.replace(/<!--[\s\S]*?-->/g, '');
}

// Two jobs over dist/sitemap.xml (copied verbatim from static/ by Vite's
// publicDir), both of which have to happen here because this is the only
// step that has both the built sitemap and the route table in hand:
//
// 1. Validate. Every <loc> must be exactly the set of ORIGIN + canonicalPath
//    for every route in routes-meta.ts's ROUTES — this is what makes "a route
//    exists but isn't in the sitemap" or "the sitemap advertises a URL the app
//    doesn't have" structurally impossible to reintroduce.
//
// 2. Stamp. static/sitemap.xml carries no <lastmod> of its own; each one is
//    written here from headCommitDate(). A hand-maintained date is correct on
//    the day it's typed and silently wrong from then on, which is exactly the
//    failure this removes.
async function syncSitemap(routes) {
  const sitemapPath = path.join(DIST, 'sitemap.xml');
  const sitemapXml = await fs.readFile(sitemapPath, 'utf8');
  const scannable = stripXmlComments(sitemapXml);
  const found = new Set([...scannable.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]));
  const expected = new Set(routes.map((r) => `${ORIGIN}${r.canonicalPath}`));

  const missing = [...expected].filter((url) => !found.has(url));
  const extra = [...found].filter((url) => !expected.has(url));

  if (missing.length > 0 || extra.length > 0) {
    const lines = [`static/sitemap.xml (dist/sitemap.xml) does not match src/routes-meta.ts's ROUTES.`];
    if (missing.length > 0) lines.push(`  missing from sitemap: ${missing.join(', ')}`);
    if (extra.length > 0) lines.push(`  in sitemap but not a route: ${extra.join(', ')}`);
    throw new Error(lines.join('\n'));
  }

  // A <lastmod> in the *source* file would be a second, hand-maintained
  // answer to a question this script already answers — fail rather than pick
  // one. Checked against static/sitemap.xml rather than the dist/ copy so a
  // date this script itself stamped on an earlier run can never be mistaken
  // for a hand-written one.
  const sourceXml = await fs.readFile(path.join(STATIC, 'sitemap.xml'), 'utf8');
  if (countOccurrences(stripXmlComments(sourceXml), '<lastmod>') > 0) {
    throw new Error(
      'static/sitemap.xml contains a hand-written <lastmod>; remove it — ' +
        'scripts/prerender.mjs stamps every <lastmod> from the HEAD commit date.',
    );
  }

  let lastmod = headCommitDate();
  if (lastmod === null) {
    lastmod = new Date().toISOString().slice(0, 10);
    console.warn(
      `warning: could not read the HEAD commit date from git; ` +
        `stamping sitemap <lastmod> with today's date (${lastmod}) instead`,
    );
  }

  // Matches a <loc> line and re-emits it followed by a <lastmod> at the same
  // indentation. Anchored per line (the 'm' flag) rather than run over the
  // whole document so the sibling tag lands where a hand-written one would.
  // Drop any <lastmod> already in the dist/ copy first, so running this
  // script twice without an intervening `vite build` (which repopulates
  // dist/ from static/) restamps rather than doubling up.
  const bare = sitemapXml.replace(/^[ \t]*<lastmod>[^<]*<\/lastmod>[ \t]*\r?\n/gm, '');

  const stamped = bare.replace(
    /^([ \t]*)<loc>([^<]*)<\/loc>[ \t]*\r?$/gm,
    (_line, indent, loc) => `${indent}<loc>${loc}</loc>\n${indent}<lastmod>${lastmod}</lastmod>`,
  );

  // Belt and braces: a <loc> written on one line with its <url>, or with
  // trailing content, wouldn't match the anchored pattern above and would
  // ship dateless. Every URL gets a date or the build fails.
  const stampedCount = countOccurrences(stripXmlComments(stamped), '<lastmod>');
  if (stampedCount !== expected.size) {
    throw new Error(
      `expected to stamp ${expected.size} <lastmod> values into dist/sitemap.xml, stamped ${stampedCount}`,
    );
  }

  await fs.writeFile(sitemapPath, stamped);
  console.log(`stamped dist/sitemap.xml with lastmod ${lastmod} (${stampedCount} URLs)`);
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

    await syncSitemap([{ canonicalPath: '/' }, ...PRERENDER_ROUTES]);

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
