#!/usr/bin/env node
/* ============================================================================
   ASSET OPTIMISER

   gpt-image-1 returns 2–4 MB PNGs. Twenty-odd of those is ~55 MB of binary in
   a git repository that a future contributor has to clone, for artwork that
   will never be displayed above ~1400 px.

   This converts everything to WebP at sane dimensions. Transparency survives;
   Next.js still re-optimises per request on top of this. Originals are kept
   under public/assets/original/ so a regeneration is never needed just to
   change a size.

     node scripts/optimize-assets.mjs
   ========================================================================= */

import { readdir, mkdir, rename, stat, access } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "assets");
const ORIGINALS = join(DIR, "original");

/* Heroes are full-bleed; objects never render larger than a few hundred px. */
const WIDTH = (name) => {
  if (name.startsWith("hero-")) return 1600;
  if (name.startsWith("wordmark-")) return 900;
  return 700;
};

const QUALITY = (name) => (name.startsWith("hero-") ? 80 : 88);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(ORIGINALS, { recursive: true });

  const files = (await readdir(DIR)).filter((f) => extname(f) === ".png");
  if (files.length === 0) {
    console.log("nothing to optimise — every PNG has already been converted.");
    return;
  }

  let before = 0;
  let after = 0;

  for (const file of files) {
    const name = basename(file, ".png");
    const src = join(DIR, file);
    const out = join(DIR, `${name}.webp`);

    const { size } = await stat(src);
    before += size;

    const image = sharp(src);
    const meta = await image.metadata();
    const target = Math.min(WIDTH(name), meta.width ?? WIDTH(name));

    await image
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: QUALITY(name), alphaQuality: 92, effort: 6 })
      .toFile(out);

    const { size: newSize } = await stat(out);
    after += newSize;

    /* Keep the original, but out of the way. */
    const archived = join(ORIGINALS, file);
    if (await exists(archived)) {
      console.log(`· ${name}: original already archived`);
    }
    await rename(src, archived);

    console.log(
      `${name.padEnd(20)} ${(size / 1e6).toFixed(2)} MB → ${(newSize / 1e3).toFixed(0)} kB  (${target}px)`,
    );
  }

  console.log(
    `\n${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB ` +
      `(${Math.round((1 - after / before) * 100)}% smaller)`,
  );
  console.log(`originals archived in public/assets/original/ (gitignored)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
