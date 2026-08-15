"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/* ============================================================================
   AMBIENT VIDEO — the moving half of AmbientPoster.

   Design Book §50: "Respect reduced-motion preferences."

   Hiding the clip with CSS is not respecting the preference. A `display:none`
   video still downloads every byte and still decodes every frame, so somebody
   who asked their system for less motion would pay 2.8 MB of desert mobile
   data and a warm phone to play something they will never see.

   So the element is not rendered at all unless motion is welcome. That is a
   client-side decision — the server cannot know the preference — which is the
   only reason this is a client component. It re-checks if the preference
   changes, because on a phone that is a toggle in Settings, not a decision
   made once at boot.

   The still poster underneath is always there, so there is nothing to flash:
   before hydration the page simply is the poster, which §48 already treats as
   the whole experience whenever a clip is missing.
   ========================================================================= */

export function AmbientVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setWelcome(!query.matches);

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  if (!welcome) return null;

  return (
    <video
      aria-hidden
      autoPlay
      muted
      loop
      playsInline
      src={src}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
