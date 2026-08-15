import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn, pct } from "@/lib/utils";
import { Glyph, type GlyphName } from "@/components/shmifting/Glyph";
import { ACCENTS, type Accent } from "@/components/shmifting/accents";
import type { Tone } from "@/components/shmifting/Status";

/* ============================================================================
   KITCHEN HQ PRIMITIVES — Design Book §41, §42, §44

   "Prioritize clear information hierarchy, fast scanning, useful filters,
    readable numbers, obvious warnings, strong tables where appropriate."

   Nothing here tilts, nothing here has a sticker shadow. The Shmifting
   identity lives in the palette, the ink outlines and the section framing —
   the environment, not every data point.
   ========================================================================= */

/* A single number that matters, big enough to read across a table. */
export function Metric({
  label,
  value,
  sub,
  tone,
  href,
  accent = "cream",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  href?: string;
  accent?: Accent;
}) {
  const body = (
    <>
      <p className="text-[12.5px] font-medium text-cream-dim">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-3xl leading-none tabular-nums",
          tone === "alarm"
            ? "text-alarm"
            : tone === "attention"
              ? "text-attention"
              : tone === "done"
                ? "text-good"
                : "text-cream",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[12.5px] text-cream-2/70">{sub}</p>}
    </>
  );

  const className = cn(
    "block rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-3.5",
    "border-s-[5px]",
    ACCENTS[accent].borderStart,
    href && "transition-colors hover:border-charcoal-5 hover:bg-charcoal-3",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* Bible §24/§30: "Do not bury critical exceptions inside dashboards."
   This is the shape a problem takes everywhere in HQ. */
export function ExceptionRow({
  tone = "attention",
  glyph,
  title,
  detail,
  href,
  cta,
  children,
}: {
  tone?: "alarm" | "attention" | "done";
  glyph?: GlyphName;
  title: ReactNode;
  detail?: ReactNode;
  href?: string;
  cta?: string;
  children?: ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border-2 border-s-[6px] px-3.5 py-3",
        tone === "alarm" && "border-alarm/60 border-s-alarm bg-alarm/[0.08]",
        tone === "attention" &&
          "border-attention/50 border-s-attention bg-attention/[0.07]",
        tone === "done" && "border-charcoal-4 border-s-good bg-charcoal-2",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2",
          tone === "alarm" && "border-alarm text-alarm",
          tone === "attention" && "border-attention text-attention",
          tone === "done" && "border-good text-good",
        )}
      >
        <Glyph
          name={glyph ?? (tone === "done" ? "check" : "alert")}
          strokeWidth={2.3}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] leading-tight text-cream">
          {title}
        </p>
        {detail && (
          <p className="mt-0.5 text-[13px] leading-snug text-cream-2/80">
            {detail}
          </p>
        )}
        {children}
      </div>

      {href && (
        <Link
          href={href}
          className="shrink-0 rounded-[9px_11px_8px_10px] border-2 border-charcoal-5 px-3 py-1.5 text-[13px] font-medium text-cream transition-colors hover:border-cream-dim hover:bg-charcoal-3"
        >
          {cta ?? "לטפל"}
        </Link>
      )}
    </li>
  );
}

/* Design Book §47: "Progress should answer: what remains?" — so the bar is
   always accompanied by the numbers, never left to speak alone. */
export function ProgressBar({
  done,
  total,
  tone = "sun",
  label,
  className,
}: {
  done: number;
  total: number;
  tone?: "sun" | "good" | "alarm" | "dust-blue";
  label?: ReactNode;
  className?: string;
}) {
  const percentage = pct(done, total);
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
          <span className="text-cream-2">{label}</span>
          <span className="tabular-nums text-cream-dim" dir="ltr">
            {done}/{total}
          </span>
        </div>
      )}
      <div
        className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-charcoal-4"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            tone === "sun" && "bg-sun",
            tone === "good" && "bg-good",
            tone === "alarm" && "bg-alarm",
            tone === "dust-blue" && "bg-dust-blue",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   TABLE — Design Book §42
   "Tables are appropriate in Kitchen HQ. Do not avoid them merely because
    they are conventional. A good table is sometimes the correct design."
   ------------------------------------------------------------------------ */

export function Table({
  head,
  children,
  className,
}: {
  head: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("shm-table min-w-full text-sm", className)}>
        <thead>
          <tr className="border-b-2 border-charcoal-4 text-start">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  numeric,
}: {
  children?: ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-cream-dim",
        numeric ? "text-end" : "text-start",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  numeric,
  ...rest
}: ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      {...rest}
      className={cn(
        "px-3 py-2.5 align-middle text-cream-2",
        numeric && "text-end tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: "alarm" | "attention";
}) {
  return (
    <tr
      className={cn(
        "border-b border-charcoal-4/70 transition-colors hover:bg-charcoal-3/60",
        tone === "alarm" && "bg-alarm/[0.06]",
        tone === "attention" && "bg-attention/[0.05]",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/* The page's own voice — HQ headings stay compact and factual. */
export function HqHeading({
  title,
  lead,
  action,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 pb-1",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-2xl leading-tight text-cream sm:text-3xl">
          {title}
        </h1>
        {lead && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cream-2/75">
            {lead}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
