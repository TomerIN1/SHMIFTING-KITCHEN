import { cn } from "@/lib/utils";

/* ============================================================================
   GLYPHS — Design Book §53
   "1. Shmifting-specific illustrated symbols  2. Simple custom functional
    symbols  3. Conventional iconography where clarity requires it.
    Do not automatically use a generic icon library for every concept."

   So: no icon package. These are drawn by hand with deliberately uneven
   geometry — a check mark whose arms are different lengths, a circle that
   isn't quite closed. At 16px the irregularity reads as warmth; the shapes
   stay conventional enough to be instantly recognisable, which §14 requires
   ("do not make functional controls difficult to recognize").
   ========================================================================= */

export type GlyphName =
  | "check"
  | "alert"
  | "eye"
  | "clock"
  | "flame"
  | "lock"
  | "unlock"
  | "person"
  | "people"
  | "plus"
  | "minus"
  | "arrow"
  | "chevron"
  | "pot"
  | "cart"
  | "coin"
  | "sun"
  | "moon"
  | "star"
  | "cross"
  | "pencil"
  | "print"
  | "exit";

const PATHS: Record<GlyphName, React.ReactNode> = {
  check: <path d="M4 12.6 L8.8 17.4 L20 5.6" />,
  alert: (
    <>
      <path d="M12 3.2 L21.4 19.6 L2.4 19.8 Z" />
      <path d="M12 9 L12.2 13.6" />
      <path d="M12.1 16.4 L12.1 16.5" strokeWidth="2.6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12.2 C6 7.2 10 5.6 12.2 5.6 C15 5.6 19 7.6 21.8 12.1 C18.6 16.6 15.2 18.4 12 18.3 C8.6 18.2 5.2 16.2 2.4 12.2 Z" />
      <circle cx="12.1" cy="12.1" r="3.1" />
    </>
  ),
  clock: (
    <>
      <path d="M12 2.9 C17.2 2.7 21.3 6.9 21.2 12.1 C21.1 17.1 17 21.2 12 21.1 C7 21 2.8 16.9 3 11.9 C3.2 7 7.1 3.1 12 2.9 Z" />
      <path d="M12 6.8 L12 12.3 L16 14.4" />
    </>
  ),
  flame: (
    <path d="M12.4 2.4 C13 6.4 16.6 7.4 17.4 11.4 C18.4 16.2 15.4 20.4 11.8 20.4 C8.2 20.4 5.4 17.4 6 13.4 C6.4 10.6 8.6 10 9 7.6 C10.4 9 10.6 10.4 10.4 11.6 C11.8 10.2 12.8 7 12.4 2.4 Z" />
  ),
  lock: (
    <>
      <path d="M4.6 10.6 L19.3 10.4 L19.6 20.4 L4.4 20.6 Z" />
      <path d="M7.8 10.4 L7.6 7.2 C7.6 4.6 9.6 3.2 12 3.2 C14.4 3.2 16.3 4.7 16.3 7.2 L16.2 10.4" />
    </>
  ),
  unlock: (
    <>
      <path d="M4.6 10.6 L19.3 10.4 L19.6 20.4 L4.4 20.6 Z" />
      <path d="M7.8 10.4 L7.6 7.2 C7.6 4.6 9.6 3.2 12 3.2 C14.4 3.2 16.3 4.7 16.3 6.6" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="7.6" r="3.9" />
      <path d="M4.4 20.6 C4.6 16 8 13.8 12.1 13.8 C16.2 13.8 19.5 16.2 19.6 20.6" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="7.8" r="3.4" />
      <path d="M2.6 20.4 C2.8 16.4 5.6 14.4 9.1 14.4 C12.5 14.4 15.3 16.4 15.4 20.4" />
      <path d="M16 5.2 C18.4 5 20.2 6.6 20.2 8.6 C20.2 10.4 18.8 11.8 17 11.9" />
      <path d="M17.6 14.8 C20 15.2 21.6 17.2 21.6 20.3" />
    </>
  ),
  plus: <path d="M12 4.6 L12 19.6 M4.5 12 L19.6 12.2" />,
  minus: <path d="M4.5 12 L19.6 12.2" />,
  arrow: <path d="M20 12 L4.4 12.2 M10.6 5.4 L4 12.1 L10.8 18.8" />,
  chevron: <path d="M15 4.6 L7.8 12.1 L15.2 19.6" />,
  pot: (
    <>
      <path d="M3.6 9.4 L20.4 9.2 L19 19.4 C18.8 20.4 18 20.9 17 20.9 L7 21 C6 21 5.2 20.4 5.1 19.4 Z" />
      <path d="M2.2 9.5 L21.8 9.3" />
      <path d="M3.4 11.4 L1.4 11.5 M20.6 11.2 L22.6 11.2" />
      <path d="M9 6.4 C9.6 4.8 8.2 4 8.8 2.4 M15 6.2 C15.6 4.6 14.2 3.8 14.8 2.2" />
    </>
  ),
  cart: (
    <>
      <path d="M2.6 4.4 L5.4 4.6 L7.8 15.6 L18.8 15.4" />
      <path d="M6.4 8 L21.2 7.6 L19.4 14 L7.6 14.2" />
      <circle cx="9.4" cy="19.4" r="1.5" />
      <circle cx="17.6" cy="19.2" r="1.5" />
    </>
  ),
  coin: (
    <>
      <path d="M12 3 C16.9 2.9 20.9 7 20.9 12 C20.9 17 16.9 21.1 12 21 C7.1 20.9 3.1 16.9 3.2 12 C3.3 7.1 7.2 3.1 12 3 Z" />
      <path d="M14.8 8.4 C13.8 7.4 9.6 7 9.4 9.6 C9.2 12.2 14.6 11.4 14.6 14.2 C14.6 16.8 10 16.6 9 15.4" />
      <path d="M12 6.2 L12 17.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.9" />
      <path d="M12 1.6 L12 4 M12 20 L12 22.4 M1.6 12 L4 12 M20 12 L22.4 12 M4.6 4.5 L6.3 6.2 M17.6 17.7 L19.4 19.5 M19.4 4.5 L17.7 6.2 M6.3 17.8 L4.5 19.5" />
    </>
  ),
  moon: (
    <path d="M20.4 14.6 C19.2 18.4 15.6 21 11.6 20.8 C6.6 20.6 2.8 16.4 3.1 11.4 C3.4 6.9 7 3.4 11.4 3.2 C9.2 6.4 9.4 10.8 12.1 13.4 C14.4 15.6 17.6 16 20.4 14.6 Z" />
  ),
  star: (
    <path d="M12 2.6 C13 8 15.9 10.9 21.3 12 C15.9 13.1 13 16 12 21.4 C11 16 8.1 13.1 2.7 12 C8.1 10.9 11 8 12 2.6 Z" />
  ),
  cross: <path d="M5.4 5.2 L18.7 18.8 M18.8 5.3 L5.3 18.7" />,
  pencil: (
    <>
      <path d="M16.4 3.4 L20.6 7.6 L8.4 19.8 L3.2 20.9 L4.3 15.6 Z" />
      <path d="M14.4 5.6 L18.5 9.7" />
    </>
  ),
  print: (
    <>
      <path d="M6.6 9.4 L6.5 3.4 L17.5 3.3 L17.6 9.4" />
      <path d="M3.4 9.4 L20.7 9.3 L20.6 16.6 L17.6 16.6 L17.5 20.7 L6.6 20.8 L6.5 16.6 L3.4 16.6 Z" />
      <path d="M9.4 13.6 L14.7 13.5" />
    </>
  ),
  /* A doorway with someone leaving through it. Distinct from `arrow`, which
     means "go back" — signing out and navigating back must never share a
     shape sitting side by side in the same header. */
  exit: (
    <>
      <path d="M13.4 3.4 L4.6 3.6 L4.4 20.4 L13.4 20.6" />
      <path d="M10.2 12 L20.6 11.9" />
      <path d="M17.2 8.4 L20.8 11.95 L17.3 15.6" />
    </>
  ),
};

export function Glyph({
  name,
  className,
  strokeWidth = 1.9,
  filled = false,
  label,
}: {
  name: GlyphName;
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
  /* Provide when the glyph carries meaning on its own; leave undefined when a
     visible text label already says the same thing (Design Book §46). */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-[1em] w-[1em] shrink-0", className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  );
}
