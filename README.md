# maxwellyeo.com

Source and static archives for Maxwell Yeo's portfolio.

## Development

Node.js 24 LTS is recommended. Node.js 22 Maintenance LTS is also supported.

```sh
cd portfolio24
npm install
npm run dev
```

Vite serves the React application from `portfolio24/` and the unchanged files in
`static/` at their root URLs, including `/archive/2017/`.

## Images / Adding new photos

`originals/` holds the full-resolution masters (untouched camera exports, up
to 6000px on the long edge) and mirrors the path layout of `static/`. It sits
outside `static/`, so Vite's `publicDir` never copies it and it is never
deployed. **Never delete anything from `originals/`** — these are the only
copies of the source images.

To add a photo:

1. Drop the full-resolution file at
   `originals/archive/img/portfolio/<name>.<ext>` (any of `.jpg`, `.jpeg`,
   `.png`, `.webp`, `.tif`, `.tiff`).
2. From `portfolio24/`, run:
   ```sh
   npm run resize-images
   ```
   This writes the WebP derivative **and** regenerates
   `portfolio24/src/data/image-dimensions.json`, the manifest of intrinsic
   width/height for every derivative that supplies the `<img>`
   `width`/`height` attributes.
3. Add `{path: "/archive/img/portfolio/<name>.webp"}` to
   `portfolio24/src/data/stills.tsx` — note the `.webp` extension
   **regardless of the source format**.

The script (`portfolio24/scripts/resize-images.mjs`) writes a WebP derivative
to the mirrored path under `static/`, capped at 1200px on the long edge,
quality 82, and never upscaled. It skips any file whose output already
exists; pass `--force` to regenerate everything (e.g. after a `sharp`
version bump — output is not guaranteed to be byte-identical across
versions) or `--dry-run` to preview without writing.

Both `originals/` and the generated `static/` derivatives are committed to
the repo, along with the generated `image-dimensions.json` manifest — it
must never be hand-edited, and must be re-committed alongside the derivative
it describes. Re-run `npm run resize-images` and re-commit the manifest
after any `--max`/`--quality` change, after a `--force` run, or after
replacing a master in `originals/`. The script is a maintenance tool run by
hand — it is deliberately not part of `npm run build`. Skipping the script
after adding a new photo produces a hard error in `npm run dev` naming the
offending path.

**Warning:** anything placed under `originals/` is published as `.webp`.
Assets that must keep their original format or filename —
`static/archive/2024/max-og.jpg`, `static/archive/2024/max-fav.png`, and
everything under `static/archive/old/` — must stay in `static/` and out of
`originals/`.

### Adding a new motion video

The motion page click-to-play facade shows a self-hosted thumbnail instead
of hotlinking YouTube, so the page makes no request to Google until a
visitor actually clicks play. To add a video:

1. Grab the thumbnail from
   `https://i.ytimg.com/vi/<youtube-id>/maxresdefault.jpg`.
2. Save it as `originals/archive/img/motion/<youtube-id>.jpg`, using the
   exact, case-correct video ID — the app derives the thumbnail path from
   the ID in `motion.tsx`, so a case mismatch is a silent 404 in
   production.
3. From `portfolio24/`, run `npm run resize-images`.
4. Add `{name: "<title>", youtube: "<youtube-id>"}` to
   `portfolio24/src/data/motion.tsx`.

Skipping step 3 produces a hard error in `npm run dev` naming the missing
derivative. Unlike the photography masters, these masters are
re-downloadable from YouTube at any time, so the "only copies" warning
above does not apply to `img/motion/` — but the "never delete from
`originals/`" rule still holds procedurally.

## Deployment

Pushes to `main` build the React application and deploy the resulting `dist/`
directory to GitHub Pages. Generated build files are not committed.

`npm run build` (from `portfolio24/`) is three steps: `tsc`, then
`vite build`, then `node scripts/prerender.mjs`. That third step
pre-renders `/stills/` and `/about/` into real files —
`dist/stills/index.html` and `dist/about/index.html` — with actual rendered
content, not meta-only stubs. GitHub Pages has no server-side rewrite rule,
so a client-side-only route listed in `static/sitemap.xml` would otherwise
be served `static/404.html` on the wire to anything that doesn't run
JavaScript (issue #29); a real file at that path is a genuine 200. `/` is
deliberately not pre-rendered — it's the landing point `static/404.html`
bounces every unmatched path to.

Adding a new route requires adding it to `portfolio24/src/routes-meta.ts`
**and** `static/sitemap.xml` — the build fails loudly if the two disagree.
`static/sitemap.xml` lists URLs only: the pre-render step stamps every
`<lastmod>` into `dist/sitemap.xml` from the HEAD commit date (UTC), so the
dates can't go stale the way a hand-written one does, and it fails the build
if a `<lastmod>` is added to the source file by hand.
Like `resize-images` above, this pre-render step reads from what's already
on disk (here, the freshly built `dist/`) rather than being folded into the
Vite build itself; unlike `resize-images` it *is* part of `npm run build`,
since a stale `dist/stills/index.html` would be exactly issue #29 again.
