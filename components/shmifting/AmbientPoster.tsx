import Image, { type StaticImageData } from "next/image";
import { hasMotion, motionSrc } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ============================================================================
   AMBIENT POSTER — the illustrated world, optionally alive.

   Design Book §48: "The world should feel alive even when nobody is touching
   it… subtle, slow, ambient, organic, occasional. Life, not distraction."
   §50: "Respect reduced-motion preferences."

   The still image is always rendered and always the poster frame. When a
   motion clip exists it plays on top, muted and looping, and it is removed
   entirely for anyone who asked their system for reduced motion — the
   `motion-reduce:hidden` class means those users get the poster, full stop.
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
      {alive && (
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          className={cn(
            "absolute inset-0 h-full w-full object-cover motion-reduce:hidden",
            className,
          )}
        >
          <source src={motionSrc(name)} type="video/mp4" />
        </video>
      )}
    </>
  );
}
