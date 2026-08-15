import Image, { type StaticImageData } from "next/image";
import { hasMotion, motionSrc } from "@/lib/motion";
import { AmbientVideo } from "./AmbientVideo";
import { cn } from "@/lib/utils";

/* ============================================================================
   AMBIENT POSTER — the illustrated world, optionally alive.

   Design Book §48: "The world should feel alive even when nobody is touching
   it… subtle, slow, ambient, organic, occasional. Life, not distraction."
   §50: "Respect reduced-motion preferences."

   The still image is always rendered and always the poster frame. When a
   motion clip exists it plays on top, muted and looping. If no clip exists,
   the still is the whole experience and nothing about the page changes.

   Anyone who asked their system for reduced motion never receives the video
   element at all — see AmbientVideo, which is a client component for exactly
   that reason. Hiding it with CSS would still have cost them the download.
   ========================================================================= */

export async function AmbientPoster({
  name,
  image,
  alt = "",
  priority = false,
  className,
  sizes = "(max-width: 1024px) 100vw, 1100px",
}: {
  /* Matches the clip name in scripts/animate-assets.mjs. */
  name: string;
  image: StaticImageData;
  alt?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const alive = await hasMotion(name);

  return (
    <>
      <Image
        src={image}
        alt={alt}
        priority={priority}
        placeholder="blur"
        sizes={sizes}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
      {alive && <AmbientVideo src={motionSrc(name)} className={className} />}
    </>
  );
}
