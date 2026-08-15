import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { HqSidebar, HqTabs } from "@/components/hq/HqNav";
import { WordmarkLink } from "@/components/shmifting/Wordmark";
import { UserBadge } from "@/components/shmifting/UserBadge";
import { Glyph } from "@/components/shmifting/Glyph";
import { getSettings, getBreakdown, defaultDiners } from "@/lib/data/camp";
import { getMenuStats } from "@/lib/data/menu";
import { getShiftStats } from "@/lib/data/shifts";
import { getShoppingList } from "@/lib/data/shopping";
import { getReadiness } from "@/lib/data/readiness";
import { daysUntil } from "@/lib/domain/readiness";

export const metadata = { title: "Kitchen HQ — SHMIFTING" };

/* ============================================================================
   KITCHEN HQ SHELL — Design Book §28 (25% world / 75% interface), §41

   The world lives in exactly three places here: the wordmark, the charcoal
   environment, and a thin status strip carrying the countdown and readiness.
   Everything below that belongs to the work.

   The alert counts on the nav are computed once, in the layout, so every
   section of HQ agrees about how much is broken.
   ========================================================================= */

export default async function HqLayout({ children }: LayoutProps<"/hq">) {
  const user = await requireAdmin();

  const [camp, diners, people, menu, shifts, shopping, readiness] = await Promise.all([
    getSettings(),
    defaultDiners(),
    getBreakdown(),
    getMenuStats(),
    getShiftStats(),
    getShoppingList(),
    getReadiness(),
  ]);

  const alerts: Record<string, number> = {};
  if (people.profilesMissing > 0) alerts["/hq/people"] = people.profilesMissing;
  if (people.unreviewedAllergies > 0)
    alerts["/hq/allergies"] = people.unreviewedAllergies;
  if (menu.blockedDiners > 0) alerts["/hq/menu"] = menu.blockedDiners;
  const missingRecipes = menu.dishesTotal - menu.dishesWithRecipe;
  if (missingRecipes > 0) alerts["/hq/recipes"] = missingRecipes;
  if (shifts.understaffed > 0) alerts["/hq/shifts"] = shifts.understaffed;
  if (shopping.summary.unassigned > 0)
    alerts["/hq/shopping"] = shopping.summary.unassigned;
  if (readiness.blockers.length > 0)
    alerts["/hq/readiness"] = readiness.blockers.length;

  const days = daysUntil(camp.departureDate);
  const locked = Boolean(camp.lockedAt);

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print sticky top-0 z-40 border-b-2 border-ink/70 bg-charcoal/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <WordmarkLink href="/hq" className="w-[118px] sm:w-[136px]" />
            <span className="hidden rounded-[8px_10px_7px_9px] border-2 border-sun/60 px-2 py-0.5 font-display text-[11px] tracking-[0.18em] text-sun sm:inline">
              KITCHEN HQ
            </span>
          </div>

          {/* The whole camp's state, in one line, on every screen. */}
          <div className="flex items-center gap-4">
            <dl className="hidden items-center gap-4 text-[12.5px] lg:flex">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-cream-dim">לאבק</dt>
                <dd className="font-bold tabular-nums text-cream" dir="ltr">
                  {days}
                </dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-cream-dim">סועדים</dt>
                <dd className="font-bold tabular-nums text-cream" dir="ltr">
                  {diners}
                </dd>
              </div>
              <Link
                href="/hq/readiness"
                className="flex items-baseline gap-1.5 rounded px-1 transition-colors hover:text-sun"
              >
                <dt className="text-cream-dim">מוכנות</dt>
                <dd
                  className="font-bold tabular-nums text-sun"
                  dir="ltr"
                >
                  {readiness.score}%
                </dd>
              </Link>
            </dl>

            {locked && (
              <span className="flex items-center gap-1.5 rounded-[8px_10px_7px_9px] border-2 border-good bg-good/15 px-2 py-1 text-[12px] font-semibold text-good">
                <Glyph name="lock" strokeWidth={2.3} />
                נעול
              </span>
            )}

            <UserBadge user={user} context="hq" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1560px] flex-1 gap-6 px-4 pb-16 pt-4 sm:px-6">
        <HqSidebar alerts={alerts} />
        <main className="min-w-0 flex-1">
          <HqTabs alerts={alerts} />
          <div className="pt-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
