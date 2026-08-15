import "server-only";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";

/* ============================================================================
   AMBIENT MOTION — optional by design.

   Clips are produced by scripts/animate-assets.mjs (FAL, image-to-video) from
   artwork that already exists. They are an enhancement, never a dependency:
   if public/motion/<name>.mp4 is absent, the still poster is the whole
   experience and nothing about the page changes.

   That is deliberate. Design Book §48 wants "life, not distraction", and a
   product whose Home breaks because a video is missing has neither.
   ========================================================================= */

const MOTION_DIR = join(process.cwd(), "public", "motion");

export const hasMotion = cache(async (name: string): Promise<boolean> => {
  try {
    await access(join(MOTION_DIR, `${name}.mp4`));
    return true;
  } catch {
    return false;
  }
});

export function motionSrc(name: string): string {
  return `/motion/${name}.mp4`;
}
