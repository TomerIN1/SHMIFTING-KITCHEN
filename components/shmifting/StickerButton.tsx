import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ACCENTS, type Accent } from "./accents";

/* ============================================================================
   STICKER BUTTON — Design Book §36
   "Primary buttons should feel physical and intentional… sticker, label, sign,
   illustrated tab, hand-held object, stamp-like shape."
   "Buttons still need to behave like buttons. Interaction clarity is
   mandatory. Avoid generic framework-default buttons."

   The physicality comes from a hard offset ink shadow rather than a blur: the
   button sits ON the poster like something stuck there. Pressing it moves it
   into its own shadow — a real, tactile displacement, not a colour change.
   ========================================================================= */

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-base gap-2",
  lg: "px-7 py-3.5 text-lg gap-2.5",
};

const SHADOW: Record<Size, string> = {
  sm: "shadow-[3px_3px_0_0_var(--color-ink)] hover:shadow-[1px_1px_0_0_var(--color-ink)] active:shadow-[0_0_0_0_var(--color-ink)]",
  md: "shadow-[4px_5px_0_0_var(--color-ink)] hover:shadow-[2px_2px_0_0_var(--color-ink)] active:shadow-[0_0_0_0_var(--color-ink)]",
  lg: "shadow-[6px_7px_0_0_var(--color-ink)] hover:shadow-[3px_3px_0_0_var(--color-ink)] active:shadow-[0_0_0_0_var(--color-ink)]",
};

const NUDGE: Record<Size, string> = {
  sm: "hover:translate-x-[-2px] hover:translate-y-[2px] active:translate-x-[-3px] active:translate-y-[3px]",
  md: "hover:translate-x-[-2px] hover:translate-y-[3px] active:translate-x-[-4px] active:translate-y-[5px]",
  lg: "hover:translate-x-[-3px] hover:translate-y-[4px] active:translate-x-[-6px] active:translate-y-[7px]",
};

export interface StickerButtonProps {
  accent?: Accent;
  size?: Size;
  variant?: "solid" | "quiet";
  /* A sticker is never applied perfectly straight. */
  tilt?: boolean;
  className?: string;
  children: ReactNode;
}

function styles({
  accent = "sun",
  size = "md",
  variant = "solid",
  tilt = false,
  className,
}: StickerButtonProps) {
  const a = ACCENTS[accent];
  return cn(
    "inline-flex items-center justify-center select-none",
    "font-display leading-none",
    "border-[2.5px] border-ink",
    "rounded-[14px_17px_13px_16px]",
    "transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "disabled:opacity-45 disabled:pointer-events-none",
    "motion-reduce:transition-none",
    SIZES[size],
    SHADOW[size],
    NUDGE[size],
    variant === "solid"
      ? cn(a.bg, a.on)
      : "bg-charcoal-3 text-cream hover:bg-charcoal-4",
    tilt && "rotate-[-1.2deg] hover:rotate-[-0.4deg]",
    className,
  );
}

export function StickerButton({
  accent,
  size,
  variant,
  tilt,
  className,
  children,
  ...rest
}: StickerButtonProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button
      {...rest}
      className={styles({ accent, size, variant, tilt, className, children })}
    >
      {children}
    </button>
  );
}

export function StickerLink({
  accent,
  size,
  variant,
  tilt,
  className,
  children,
  ...rest
}: StickerButtonProps & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link
      {...rest}
      className={styles({ accent, size, variant, tilt, className, children })}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   A quieter control for dense operational screens. Kitchen HQ needs dozens of
   these on one page and full sticker treatment would be exhausting to look at
   (Design Book §28: clarity wins) — but it still carries the ink outline, so
   it never becomes a default framework button.
   ------------------------------------------------------------------------ */

export function ToolButton({
  className,
  accent = "cream",
  active = false,
  ...rest
}: ComponentProps<"button"> & { accent?: Accent; active?: boolean }) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
        "rounded-[9px_11px_8px_10px] border-2 px-3 py-1.5 text-sm font-medium",
        "transition-colors duration-150",
        "disabled:opacity-40 disabled:pointer-events-none",
        active
          ? cn(ACCENTS[accent].bg, ACCENTS[accent].on, "border-ink")
          : "border-charcoal-5 bg-charcoal-3 text-cream-2 hover:border-cream-dim hover:bg-charcoal-4 hover:text-cream",
        className,
      )}
    />
  );
}
