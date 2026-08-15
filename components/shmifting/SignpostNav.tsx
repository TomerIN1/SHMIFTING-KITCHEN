"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ACCENTS, type Accent } from "./accents";
import { Glyph, type GlyphName } from "./Glyph";

/* ============================================================================
   THE SIGNPOST — the Shmifter navigation
   Design Book §11 (REUSE BEFORE INVENTION) and CLAUDE.md §12: Golden
   Reference 02 already contains this product's navigation. A weathered wooden
   post carrying arrow-shaped signs, each with a Hebrew label and a small
   human subtitle beneath it.

   Two of the subtitles below ("ביחד, כל הזמן", "כי חייבים לאכול") are lifted
   verbatim off the Golden Reference — that is the camp's own voice, already
   approved, and there is no reason to write new ones.

   Desktop keeps the literal signpost: a vertical post, signs branching off it,
   arrow tips pointing into the content (leftward in RTL).
   Mobile becomes a rail of small hanging plaques — the same printed objects,
   recomposed rather than shrunk (Design Book §57).
   ========================================================================= */

export interface NavItem {
  href: string;
  label: string;
  sub: string;
  accent: Accent;
  glyph: GlyphName;
  /* Rendered as a small count on the sign — real work waiting, never a badge
     invented to create engagement (CLAUDE.md §21). */
  badge?: number;
}

export const SHMIFTER_NAV: NavItem[] = [
  { href: "/", label: "בית", sub: "איפה אנחנו", accent: "pink", glyph: "pot" },
  {
    href: "/profile",
    label: "הפרופיל",
    sub: "מה אתם אוכלים",
    accent: "lavender",
    glyph: "person",
  },
  { href: "/vote", label: "הצבעות", sub: "תנו אש", accent: "sun", glyph: "flame" },
  {
    href: "/shifts",
    label: "משמרות",
    sub: "ביחד, כל הזמן",
    accent: "dust-blue",
    glyph: "clock",
  },
  {
    href: "/menu",
    label: "התפריט",
    sub: "כי חייבים לאכול",
    accent: "terracotta",
    glyph: "star",
  },
];

function useActive(href: string) {
  const pathname = usePathname();
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* Arrow-shaped sign, tip pointing into the content. */
const SIGN_CLIP = "polygon(0% 50%, 9% 0%, 100% 0%, 100% 100%, 9% 100%)";

function Sign({ item, badge }: { item: NavItem; badge?: number }) {
  const active = useActive(item.href);
  const a = ACCENTS[item.accent];

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative block transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
        /* The sign swings out from the post, toward the content it points at.
           The post stands on the outer edge, so in RTL that is leftward. */
        active
          ? "translate-x-[6px] rtl:-translate-x-[6px]"
          : "hover:translate-x-[4px] rtl:hover:-translate-x-[4px]",
      )}
    >
      {/* The ink outline, drawn as a slightly larger clipped layer behind the
          sign face — clip-path cannot carry a border. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-ink"
        style={{ clipPath: SIGN_CLIP, transform: "scale(1.035)" }}
      />
      <span
        className={cn(
          "relative flex items-center gap-2.5 py-2.5 ps-6 pe-4",
          active ? a.bg : "bg-cream-3",
          active ? a.on : "text-ink/75",
          "group-hover:brightness-105",
        )}
        style={{ clipPath: SIGN_CLIP }}
      >
        <Glyph
          name={item.glyph}
          className="text-lg"
          strokeWidth={2.1}
          filled={false}
        />
        <span className="min-w-0">
          <span className="block font-display text-[15px] leading-tight">
            {item.label}
          </span>
          <span className="block text-[10.5px] leading-tight opacity-70">
            {item.sub}
          </span>
        </span>
        {badge ? (
          <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-alarm px-1 text-[11px] font-bold text-cream tabular-nums">
            {badge}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function SignpostNav({ badges }: { badges?: Record<string, number> }) {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="no-print relative hidden w-[220px] shrink-0 lg:block"
    >
      {/* Offset clears the sticky header above it. */}
      <div className="sticky top-[86px] pb-10">
        {/* The post itself — planted on the outer edge, with the signs nailed
            to it and pointing inward at the content. */}
        <div
          aria-hidden
          className="absolute inset-y-0 start-0 w-[15px] rounded-t-sm border-x-[2.5px] border-ink bg-terracotta/80"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, rgba(11,12,16,0.22) 0 1px, transparent 1px 9px)",
          }}
        />
        <ul className="relative space-y-2.5 pe-3">
          {SHMIFTER_NAV.map((item) => (
            <li key={item.href}>
              <Sign item={item} badge={badges?.[item.href]} />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------------------
   MOBILE RAIL — the same signs, hung from a rail instead of nailed to a post.
   ------------------------------------------------------------------------ */

export function SignpostRail({ badges }: { badges?: Record<string, number> }) {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="no-print fixed inset-x-0 bottom-0 z-50 lg:hidden"
    >
      {/* The rail the plaques hang from. */}
      <div
        aria-hidden
        className="h-[3px] w-full bg-ink"
        style={{ boxShadow: "0 -1px 0 rgba(244,230,200,0.18)" }}
      />
      <ul
        className="flex items-stretch justify-between gap-1 border-t-2 border-ink bg-charcoal-2/97 px-1.5 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-sm"
      >
        {SHMIFTER_NAV.map((item) => (
          <Plaque key={item.href} item={item} badge={badges?.[item.href]} />
        ))}
      </ul>
    </nav>
  );
}

function Plaque({ item, badge }: { item: NavItem; badge?: number }) {
  const active = useActive(item.href);
  const a = ACCENTS[item.accent];

  return (
    <li className="min-w-0 flex-1">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-full flex-col items-center justify-center gap-0.5 rounded-[9px_11px_8px_10px] border-2 px-1 py-1.5",
          "transition-transform duration-200 motion-reduce:transition-none",
          active
            ? cn("border-ink translate-y-0.5", a.bg, a.on)
            : "border-transparent text-cream-2/75 hover:text-cream",
        )}
      >
        <Glyph name={item.glyph} className="text-[19px]" strokeWidth={2} />
        <span className="max-w-full truncate text-[10.5px] font-medium leading-none">
          {item.label}
        </span>
        {badge ? (
          <span className="absolute -top-1 start-1 flex h-4 min-w-4 items-center justify-center rounded-full border-[1.5px] border-ink bg-alarm px-0.5 text-[10px] font-bold text-cream tabular-nums">
            {badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
