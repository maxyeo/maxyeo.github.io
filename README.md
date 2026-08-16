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
the repo. The script is a maintenance tool run by hand — it is deliberately
not part of `npm run build`.

**Warning:** anything placed under `originals/` is published as `.webp`.
Assets that must keep their original format or filename —
`static/archive/2024/max-og.jpg`, `static/archive/2024/max-fav.png`, and
everything under `static/archive/old/` — must stay in `static/` and out of
`originals/`.

## Deployment

Pushes to `main` build the React application and deploy the resulting `dist/`
directory to GitHub Pages. Generated build files are not committed.
