#!/usr/bin/env node
// Generates web-sized WebP derivatives from the full-resolution masters in
// originals/, writing them out to the mirrored path under static/.
//
// Usage (run from portfolio24/):
//   npm run resize-images                # generate any missing derivatives
//   npm run resize-images -- --force     # regenerate everything
//   npm run resize-images -- --dry-run   # report only, write nothing
//   npm run resize-images -- --max=1200 --quality=82
//
// See README.md ("Images / Adding new photos") for the full workflow.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // portfolio24/scripts
const REPO_ROOT = path.resolve(HERE, '..', '..'); // repo root
const SRC_ROOT = path.join(REPO_ROOT, 'originals');
const OUT_ROOT = path.join(REPO_ROOT, 'static');

// The stills grid (#stills, stills-page.css) is max-width 1200px with three
// ~32% columns, so a still renders at roughly 380 CSS px wide; the about-page
// portrait renders at up to ~1136 CSS px. 1200px on the long edge covers both
// at >=2x DPR.
const DEFAULT_MAX_EDGE = 1200;
const DEFAULT_QUALITY = 82;

const ACCEPTED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tif',
  '.tiff',
]);

const USAGE = `Usage: npm run resize-images -- [options]

  --force            regenerate derivatives even if the output already exists
  --dry-run          report what would be written, but write nothing
  --max=<px>         long-edge cap in pixels (default ${DEFAULT_MAX_EDGE})
  --quality=<1-100>  WebP quality (default ${DEFAULT_QUALITY})
  --help, -h         show this message`;

function parseNumericFlag(arg, flag, min, max) {
  const raw = arg.slice(flag.length + 1); // +1 for the '='
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `${flag} expects an integer between ${min} and ${max}, got "${raw}"`,
    );
  }
  return value;
}

function parseArgs(argv) {
  const args = {
    force: false,
    dryRun: false,
    help: false,
    maxEdge: DEFAULT_MAX_EDGE,
    quality: DEFAULT_QUALITY,
  };
  for (const arg of argv) {
    if (arg === '--force') {
      args.force = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg.startsWith('--max=')) {
      args.maxEdge = parseNumericFlag(arg, '--max', 1, 20000);
    } else if (arg.startsWith('--quality=')) {
      args.quality = parseNumericFlag(arg, '--quality', 1, 100);
    } else {
      // Fail loudly rather than silently ignoring a typo: a mistyped
      // --dry-run would otherwise write files the caller did not expect.
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`.padStart(10);
}

function formatDims(w, h) {
  return `${w}x${h}`;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function processFile(job, args, stats) {
  const { inputPath, outPath, ext } = job;

  if (path.resolve(outPath) === path.resolve(inputPath)) {
    throw new Error(`refusing to overwrite input in place: ${inputPath}`);
  }

  const label = path.relative(REPO_ROOT, outPath);

  if (!args.force && (await fileExists(outPath))) {
    console.log(`skip    ${label.padEnd(48)} (output exists, use --force to regenerate)`);
    stats.skipped += 1;
    return;
  }

  const inputBuffer = await fs.readFile(inputPath);
  const inputMeta = await sharp(inputBuffer, { failOn: 'none' }).metadata();

  const isConversion = ext.toLowerCase() !== '.webp';
  const verb = isConversion ? 'convert' : 'resize';

  if (args.dryRun) {
    console.log(
      `${verb.padEnd(7)} ${label.padEnd(48)} ${formatDims(inputMeta.width, inputMeta.height).padEnd(10)} ${formatBytes(inputBuffer.length)}  (dry-run)`,
    );
    stats.skipped += 1;
    return;
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const tmpPath = `${outPath}.tmp`;

  let info;
  try {
    info = await sharp(inputBuffer, { failOn: 'none' })
      .rotate() // apply EXIF orientation before measuring/resizing
      .resize({
        width: args.maxEdge,
        height: args.maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: args.quality, effort: 6 })
      .toFile(tmpPath);
  } catch (err) {
    // Clean up the partial write so a failed run cannot leave a truncated
    // *.webp.tmp behind in static/, where publicDir would deploy it. The
    // guard keeps this removal incapable of targeting anything but the
    // scratch file constructed immediately above.
    if (tmpPath.endsWith('.tmp')) {
      await fs.rm(tmpPath, { force: true });
    }
    throw err;
  }

  await fs.rename(tmpPath, outPath);

  const before = inputBuffer.length;
  const after = info.size;
  const pct = before > 0 ? ((after - before) / before) * 100 : 0;

  console.log(
    `${verb.padEnd(7)} ${label.padEnd(48)} ${formatDims(inputMeta.width, inputMeta.height).padEnd(10)} ${formatBytes(before)} -> ${formatDims(info.width, info.height).padEnd(10)} ${formatBytes(after)}  (${pct.toFixed(1)}%)`,
  );

  stats.processed += 1;
  stats.inputBytes += before;
  stats.outputBytes += after;
}

// Warns about derivatives in static/ that no longer have a master in
// originals/ — the "someone deleted an original but the generated file
// lingered" case. Only the directories that actually receive derivatives are
// inspected, and only non-recursively, so unrelated assets living alongside
// them (max-og.jpg, max-fav.png) are never considered. Warn only: this
// function must never delete anything.
async function findOrphans(expectedOutputs) {
  const warnings = [];
  const dirs = new Set([...expectedOutputs].map((p) => path.dirname(p)));

  for (const dir of dirs) {
    if (!(await fileExists(dir))) continue;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith('.')) continue;
      if (path.extname(entry.name).toLowerCase() !== '.webp') continue;
      const outFile = path.join(dir, entry.name);
      if (!expectedOutputs.has(path.resolve(outFile))) {
        warnings.push(
          `warn: orphan derivative, no original: ${path.relative(REPO_ROOT, outFile)}`,
        );
      }
    }
  }
  return warnings;
}

async function collectJobs() {
  const jobs = [];
  for await (const inputPath of walk(SRC_ROOT)) {
    const rel = path.relative(SRC_ROOT, inputPath);
    const ext = path.extname(rel);
    if (!ACCEPTED_EXTENSIONS.has(ext.toLowerCase())) continue;
    const outPath = path.join(OUT_ROOT, `${rel.slice(0, -ext.length)}.webp`);
    jobs.push({ inputPath, outPath, ext });
  }
  return jobs;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${err.message}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  if (args.help) {
    console.log(USAGE);
    return;
  }

  if (!(await fileExists(SRC_ROOT))) {
    console.error(`originals/ not found at ${SRC_ROOT}`);
    process.exitCode = 1;
    return;
  }

  const stats = {
    processed: 0,
    skipped: 0,
    failed: 0,
    inputBytes: 0,
    outputBytes: 0,
  };

  const jobs = await collectJobs();
  const expectedOutputs = new Set(jobs.map((j) => path.resolve(j.outPath)));

  for (const job of jobs) {
    try {
      await processFile(job, args, stats);
    } catch (err) {
      stats.failed += 1;
      console.error(`fail    ${path.relative(REPO_ROOT, job.inputPath)}: ${err.message}`);
    }
  }

  const warnings = await findOrphans(expectedOutputs);
  for (const w of warnings) console.warn(w);

  const savedPct =
    stats.inputBytes > 0
      ? ((stats.outputBytes - stats.inputBytes) / stats.inputBytes) * 100
      : 0;

  console.log('');
  console.log(
    `processed=${stats.processed} skipped=${stats.skipped} failed=${stats.failed} orphans=${warnings.length}`,
  );
  if (stats.processed > 0) {
    console.log(
      `input=${(stats.inputBytes / (1024 * 1024)).toFixed(2)} MB output=${(stats.outputBytes / (1024 * 1024)).toFixed(2)} MB (${savedPct.toFixed(1)}%)`,
    );
  }

  if (stats.failed > 0) {
    process.exitCode = 1;
  }
}

main();
