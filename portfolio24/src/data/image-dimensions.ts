// GENERATED FILE — do not hand-edit.
//
// src/data/image-dimensions.json is produced by
// `npm run resize-images` (see scripts/resize-images.mjs). It maps every
// image derivative's public path (e.g. "/archive/img/portfolio/foo.webp")
// to its intrinsic pixel width/height, which callers use to render <img>
// width/height attributes and avoid layout shift. See README.md
// ("Images / Adding new photos") for the full workflow.

import manifest from './image-dimensions.json';

export interface ImageDimensions {
  width: number;
  height: number;
}

const dimensions: Record<string, ImageDimensions | undefined> = manifest;

// Looks up the intrinsic dimensions for an image's public path. A miss means
// the manifest is out of date relative to the app's image references — in
// dev this throws immediately so the problem is caught before it ships; in
// production it logs and returns undefined so a stale manifest degrades to
// missing width/height rather than a crash.
export function getImageDimensions(path: string): ImageDimensions | undefined {
  const found = dimensions[path];
  if (found) return found;

  const message = `No image dimensions found for "${path}". Run \`npm run resize-images\` to regenerate src/data/image-dimensions.json.`;
  if (import.meta.env.DEV) {
    throw new Error(message);
  }
  console.error(message);
  return undefined;
}
