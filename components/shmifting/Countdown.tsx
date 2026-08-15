import { cn } from "@/lib/utils";
import { daysUntil } from "@/lib/domain/readiness";

/* ============================================================================
   DAYS TO THE DUST — Bible §9
   The Home must answer "where are we?" before anything else.

   Design Book §33 governs the language mix: Hebrew does the talking, English
   is reserved for the camp's own brand phrases. So the number and its Hebrew
   noun carry the meaning, and "DAYS TO THE DUST" sits underneath as voice.

   Rendered on the server from a date, so there is no hydration flicker and no
   ticking clock — this is a countdown in days, and days do not need a timer.
   ========================================================================= */

export function Countdown({
  date,
  className,
  tone = "paper",
}: {
  date: Date;
  className?: string;
  tone?: "paper" | "bare";
}) {
  const days = daysUntil(date);
  const past = days < 0;
  const today = days === 0;

  const value = today ? "היום" : past ? `${Math.abs(days)}` : `${days}`;

  const caption = today
    ? "יוצאים לאבק"
    : past
      ? "ימים מאז שיצאנו"
      : days === 1
        ? "יום לאבק"
        : "ימים לאבק";

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center",
        tone === "paper" &&
          "shm-paper shm-outline shm-lift-lg rounded-[20px_26px_18px_24px] px-6 py-3 rotate-[-1.5deg]",
        className,
      )}
    >
      <span
        className={cn(
          "font-display leading-[0.85] tabular-nums",
          today ? "text-4xl sm:text-5xl" : "text-6xl sm:text-7xl",
          tone === "paper" ? "text-ink" : "text-cream shm-ink-shadow-text",
        )}
        dir="ltr"
      >
        {value}
      </span>
      <span
        className={cn(
          "mt-1 font-display text-sm tracking-wide",
          tone === "paper" ? "text-ink/70" : "text-cream-2",
        )}
      >
        {caption}
      </span>
      {!past && (
        <span
          className={cn(
            "mt-0.5 text-[10px] font-semibold tracking-[0.26em]",
            tone === "paper" ? "text-terracotta" : "text-sun",
          )}
          dir="ltr"
        >
          DAYS TO THE DUST
        </span>
      )}
    </div>
  );
}
