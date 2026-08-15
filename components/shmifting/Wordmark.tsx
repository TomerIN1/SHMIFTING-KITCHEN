import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import wordmark from "@/public/assets/wordmark-shmifting.webp";
import tagline from "@/public/assets/wordmark-tagline.webp";

/* ============================================================================
   THE WORDMARK
   Not typeset — this is the actual approved lettering, cut out of Golden
   Reference 02 by scripts/extract-wordmark.py. No webfont reproduces drips,
   riso grain and per-letter colour drift, and an approximation would quietly
   become a second, wrong logo (CLAUDE.md §5, §11).
   ========================================================================= */

export function Wordmark({
  className,
  withTagline = false,
  priority = false,
}: {
  className?: string;
  withTagline?: boolean;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col items-center", className)}>
      <Image
        src={wordmark}
        alt="SHMIFTING"
        priority={priority}
        className="h-auto w-full"
        sizes="(max-width: 640px) 80vw, 640px"
      />
      {withTagline && (
        <Image
          src={tagline}
          alt="GIFT OR SHMIFT?"
          priority={priority}
          className="mt-1 h-auto w-[46%]"
          sizes="(max-width: 640px) 40vw, 300px"
        />
      )}
    </span>
  );
}

export function WordmarkLink({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="SHMIFTING KITCHEN — לדף הבית"
      className={cn("block transition-transform hover:scale-[1.03]", className)}
    >
      <Image
        src={wordmark}
        alt="SHMIFTING"
        priority
        className="h-auto w-full"
        sizes="240px"
      />
    </Link>
  );
}
