import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Glyph, type GlyphName } from "./Glyph";

/* ============================================================================
   STATUS — Design Book §46
   "Statuses should communicate meaning through more than color…
    Never depend exclusively on red/green differentiation."

   Every status therefore ships three signals at once: a glyph, a word, and a
   colour. Remove any one of them and the meaning survives. That is not only
   an accessibility rule — a Kitchen Lead scanning forty shopping rows reads
   the shapes long before the hues.
   ========================================================================= */

export type Tone = "done" | "attention" | "alarm" | "idle" | "live";

const TONES: Record<Tone, { chip: string; glyph: GlyphName; dot: string }> = {
  done: {
    chip: "bg-good/20 text-good border-good/60",
    glyph: "check",
    dot: "bg-good",
  },
  attention: {
    chip: "bg-attention/20 text-attention border-attention/60",
    glyph: "alert",
    dot: "bg-attention",
  },
  alarm: {
    chip: "bg-alarm/20 text-alarm border-alarm/70",
    glyph: "alert",
    dot: "bg-alarm",
  },
  idle: {
    chip: "bg-charcoal-4 text-cream-dim border-charcoal-5",
    glyph: "clock",
    dot: "bg-cream-dim",
  },
  live: {
    chip: "bg-sun/20 text-sun border-sun/60",
    glyph: "flame",
    dot: "bg-sun",
  },
};

export function StatusChip({
  tone,
  children,
  glyph,
  className,
  size = "md",
}: {
  tone: Tone;
  children: ReactNode;
  glyph?: GlyphName;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[7px_9px_6px_8px] border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        t.chip,
        className,
      )}
    >
      <Glyph name={glyph ?? t.glyph} className="text-[0.95em]" strokeWidth={2.4} />
      {children}
    </span>
  );
}

/* A capacity reading: "3 / 4". Design Book §39 says this number matters more
   than decorative cleverness, so it is set in tabular figures and forced LTR
   so the slash never flips inside Hebrew text. */
export function Capacity({
  filled,
  required,
  className,
}: {
  filled: number;
  required: number;
  className?: string;
}) {
  const missing = required - filled;
  const tone: Tone = missing <= 0 ? "done" : missing >= required ? "alarm" : "attention";
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-display tabular-nums",
        tone === "done" && "text-good",
        tone === "attention" && "text-attention",
        tone === "alarm" && "text-alarm",
        className,
      )}
      dir="ltr"
    >
      <span className="text-[1.05em]">{filled}</span>
      <span className="opacity-50">/</span>
      <span className="opacity-80">{required}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   ALLERGY NOTICE — Design Book §43, CLAUDE.md §16
   "Allergy information must immediately stand apart from playful decoration.
    It should communicate ATTENTION, not FUN."

   This surface deliberately breaks the Shmifting language: no tilt, no
   sticker shadow, no illustrated character, no joke, no organic radius. When
   a member sees this shape anywhere in the product, it means somebody's
   safety is involved. That contrast IS the design.
   ------------------------------------------------------------------------ */

export function AllergyNotice({
  severity = "avoid",
  title,
  children,
  className,
}: {
  severity?: "avoid" | "severe" | "anaphylaxis";
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const critical = severity !== "avoid";
  return (
    <div
      role="note"
      className={cn(
        "relative overflow-hidden rounded-md border-r-[6px] border-2 p-3.5",
        critical
          ? "border-alarm bg-alarm/12 text-cream"
          : "border-attention bg-attention/10 text-cream",
        className,
      )}
    >
      {/* Hazard banding, only at the two serious levels. */}
      {critical && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5 opacity-80"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, var(--color-alarm) 0 8px, transparent 8px 16px)",
          }}
        />
      )}
      <p
        className={cn(
          "flex items-center gap-2 font-display text-sm tracking-wide",
          critical ? "text-alarm" : "text-attention",
          critical && "mt-1",
        )}
      >
        <Glyph name="alert" strokeWidth={2.3} label="אזהרת בטיחות" />
        {title}
      </p>
      {children && (
        <div className="mt-1.5 text-sm leading-relaxed text-cream-2">
          {children}
        </div>
      )}
    </div>
  );
}
