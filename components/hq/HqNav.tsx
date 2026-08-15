"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Glyph, type GlyphName } from "@/components/shmifting/Glyph";

/* ============================================================================
   KITCHEN HQ NAVIGATION — Design Book §28, §41

   Deliberately NOT the signpost. The signpost is the member's language: warm,
   tilted, slow to read. A Kitchen Lead moves between ten sections dozens of
   times in an evening and needs a rail they can hit without aiming.

   What keeps it Shmifting is the ink outline, the cream active state and the
   palette — not decoration bolted onto every row.

   Counts are exceptions waiting for attention (Bible §30: "The Kitchen HQ
   should prioritize exceptions and unfinished work").
   ========================================================================= */

export interface HqNavItem {
  href: string;
  label: string;
  glyph: GlyphName;
  alerts?: number;
}

export const HQ_NAV: Omit<HqNavItem, "alerts">[] = [
  { href: "/hq", label: "סקירה", glyph: "eye" },
  { href: "/hq/people", label: "אנשים", glyph: "people" },
  { href: "/hq/allergies", label: "אלרגיות", glyph: "alert" },
  { href: "/hq/votes", label: "הצבעות", glyph: "flame" },
  { href: "/hq/menu", label: "תפריט", glyph: "star" },
  { href: "/hq/recipes", label: "מתכונים", glyph: "pot" },
  { href: "/hq/shifts", label: "משמרות", glyph: "clock" },
  { href: "/hq/shopping", label: "קניות", glyph: "cart" },
  /* Sits beside shopping and before budget: the other half of the money. */
  { href: "/hq/equipment", label: "ציוד", glyph: "pot" },
  { href: "/hq/budget", label: "תקציב", glyph: "coin" },
  { href: "/hq/readiness", label: "מוכנות", glyph: "check" },
  { href: "/hq/pack", label: "חבילת המטבח", glyph: "print" },
  { href: "/hq/settings", label: "הגדרות", glyph: "pencil" },
];

function useActive(href: string) {
  const pathname = usePathname();
  if (href === "/hq") return pathname === "/hq";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Item({
  item,
  alerts,
  compact,
}: {
  item: Omit<HqNavItem, "alerts">;
  alerts?: number;
  compact?: boolean;
}) {
  const active = useActive(item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 whitespace-nowrap rounded-[10px_12px_9px_11px] border-2 transition-colors",
        compact ? "px-3 py-2 text-[13px]" : "px-3 py-2 text-sm",
        active
          ? "border-ink bg-cream font-semibold text-ink"
          : "border-transparent text-cream-2/80 hover:bg-charcoal-3 hover:text-cream",
      )}
    >
      <Glyph name={item.glyph} className="text-[17px]" strokeWidth={2} />
      <span className="min-w-0">{item.label}</span>
      {alerts ? (
        <span
          className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-ink bg-alarm px-1 text-[11px] font-bold tabular-nums text-cream"
          title={`${alerts} דברים שדורשים טיפול`}
        >
          {alerts}
        </span>
      ) : null}
    </Link>
  );
}

export function HqSidebar({ alerts }: { alerts?: Record<string, number> }) {
  return (
    <nav
      aria-label="ניווט Kitchen HQ"
      className="no-print hidden w-[186px] shrink-0 md:block"
    >
      <ul className="sticky top-[76px] space-y-0.5 pb-8">
        {HQ_NAV.map((item) => (
          <li key={item.href}>
            <Item item={item} alerts={alerts?.[item.href]} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function HqTabs({ alerts }: { alerts?: Record<string, number> }) {
  return (
    <nav
      aria-label="ניווט Kitchen HQ"
      className="no-print -mx-4 overflow-x-auto border-b-2 border-charcoal-4 px-4 pb-2 md:hidden"
    >
      <ul className="flex gap-1.5">
        {HQ_NAV.map((item) => (
          <li key={item.href} className="shrink-0">
            <Item item={item} alerts={alerts?.[item.href]} compact />
          </li>
        ))}
      </ul>
    </nav>
  );
}
