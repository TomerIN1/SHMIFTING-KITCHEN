/* ============================================================================
   ACCENTS
   Design Book §9: "Color should feel distributed, not branded around one
   corporate primary color. Shmifting does not have blue = primary action."

   So an accent is chosen per object, not per function. What must NOT vary is
   meaning — the reserved state colours (alarm / attention / good) live in
   globals.css and are never used decoratively.

   Tailwind v4 generates utilities from the @theme block at build time, so
   every class below is written out in full. Never build these strings by
   interpolation — they would not exist in the output CSS.
   ========================================================================= */

export type Accent =
  | "pink"
  | "lavender"
  | "sun"
  | "peach"
  | "terracotta"
  | "dust-blue"
  | "good"
  | "cream";

export interface AccentStyle {
  bg: string;
  text: string;
  border: string;
  /* Text colour that stays readable on top of `bg`. */
  on: string;
  ring: string;
  softBg: string;
  /* Leading-edge rule, used for HQ metric tiles. Written out in full because
     Tailwind cannot see a class that was built by string manipulation. */
  borderStart: string;
}

export const ACCENTS: Record<Accent, AccentStyle> = {
  pink: {
    bg: "bg-shmift-pink",
    text: "text-shmift-pink",
    border: "border-shmift-pink",
    on: "text-ink",
    ring: "ring-shmift-pink",
    softBg: "bg-shmift-pink/15",
    borderStart: "border-s-shmift-pink",
  },
  lavender: {
    bg: "bg-lavender",
    text: "text-lavender",
    border: "border-lavender",
    on: "text-ink",
    ring: "ring-lavender",
    softBg: "bg-lavender/15",
    borderStart: "border-s-lavender",
  },
  sun: {
    bg: "bg-sun",
    text: "text-sun",
    border: "border-sun",
    on: "text-ink",
    ring: "ring-sun",
    softBg: "bg-sun/15",
    borderStart: "border-s-sun",
  },
  peach: {
    bg: "bg-peach",
    text: "text-peach",
    border: "border-peach",
    on: "text-ink",
    ring: "ring-peach",
    softBg: "bg-peach/15",
    borderStart: "border-s-peach",
  },
  terracotta: {
    bg: "bg-terracotta",
    text: "text-terracotta",
    border: "border-terracotta",
    on: "text-ink",
    ring: "ring-terracotta",
    softBg: "bg-terracotta/15",
    borderStart: "border-s-terracotta",
  },
  "dust-blue": {
    bg: "bg-dust-blue",
    text: "text-dust-blue",
    border: "border-dust-blue",
    on: "text-ink",
    ring: "ring-dust-blue",
    softBg: "bg-dust-blue/15",
    borderStart: "border-s-dust-blue",
  },
  good: {
    bg: "bg-good",
    text: "text-good",
    border: "border-good",
    on: "text-ink",
    ring: "ring-good",
    softBg: "bg-good/15",
    borderStart: "border-s-good",
  },
  cream: {
    bg: "bg-cream",
    text: "text-cream",
    border: "border-cream",
    on: "text-ink",
    ring: "ring-cream",
    softBg: "bg-cream/10",
    borderStart: "border-s-cream",
  },
};

export const ACCENT_CYCLE: Accent[] = [
  "pink",
  "sun",
  "lavender",
  "peach",
  "dust-blue",
  "terracotta",
];

/** Give any list of things a stable, varied colour without repeating
    neighbours — used for vote options, meal days, category headers. */
export function accentFor(index: number): Accent {
  return ACCENT_CYCLE[index % ACCENT_CYCLE.length];
}
