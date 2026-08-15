import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ACCENTS, type Accent } from "./accents";

/* ============================================================================
   SURFACES
   Design Book §35: "Cards are allowed. Generic cards are not."

   Two surfaces carry everything in this product, and the choice between them
   is the 80/20 vs 25/75 decision (Design Book §27, §28):

     PaperCard  — cream printed stock. The member world, and anything a human
                  will read closely or put on paper. Warm, physical, tilted.
     Panel      — charcoal, structured, quiet. Kitchen HQ. Built to be looked
                  at for an hour without fighting it.
   ========================================================================= */

export function PaperCard({
  className,
  accent,
  tilt = 0,
  children,
  ...rest
}: ComponentProps<"div"> & { accent?: Accent; tilt?: number }) {
  return (
    <div
      {...rest}
      style={tilt ? { rotate: `${tilt}deg`, ...rest.style } : rest.style}
      className={cn(
        "relative shm-paper shm-outline shm-lift shm-card-radius",
        className,
      )}
    >
      {/* An inked spine along the leading edge — the small printed detail that
          keeps a rectangle from reading as a default component-library card. */}
      {accent && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-3 start-0 w-1.5 -translate-x-[3px] rtl:translate-x-[3px] rounded-full border-2 border-ink",
            ACCENTS[accent].bg,
          )}
        />
      )}
      {children}
    </div>
  );
}

export function Panel({
  className,
  title,
  action,
  accent,
  children,
  ...rest
  /* `title` is shadowed deliberately — the HTML attribute would restrict it
     to a string, and panel headings carry markup. */
}: Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  action?: ReactNode;
  accent?: Accent;
}) {
  return (
    <section {...rest} className={cn("shm-panel overflow-hidden", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b-2 border-charcoal-4 bg-charcoal-3 px-4 py-2.5">
          <h2 className="flex items-center gap-2 font-display text-base text-cream">
            {accent && (
              <span
                aria-hidden
                className={cn(
                  "h-3 w-3 rounded-[3px_4px_2px_4px] border-2 border-ink",
                  ACCENTS[accent].bg,
                )}
              />
            )}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------------------
   STATEMENT — Design Book §34
   "Large statement ↓ Short human explanation ↓ Primary interaction."
   Screens start with a voice, not with navigation chrome.
   ------------------------------------------------------------------------ */

export function Statement({
  eyebrow,
  title,
  lead,
  className,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && (
        <p className="mb-2 font-display text-sm tracking-[0.22em] text-sun uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="shm-poster text-3xl leading-[1.05] text-cream sm:text-4xl md:text-5xl">
        {title}
      </h1>
      {lead && (
        <p className="mt-4 text-base leading-relaxed text-cream-2/90 sm:text-lg">
          {lead}
        </p>
      )}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   SECTION HEADING — quieter than a Statement, still not a bare <h2>.
   ------------------------------------------------------------------------ */

export function SectionTitle({
  children,
  note,
  accent = "sun",
  className,
}: {
  children: ReactNode;
  note?: ReactNode;
  accent?: Accent;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-baseline gap-3", className)}>
      <h2 className="font-display text-xl text-cream sm:text-2xl">{children}</h2>
      <span
        aria-hidden
        className={cn(
          "h-[3px] flex-1 rounded-full opacity-45",
          ACCENTS[accent].bg,
        )}
      />
      {note && (
        <span className="shrink-0 text-sm text-cream-dim">{note}</span>
      )}
    </div>
  );
}
