import Link from "next/link";
import { getMenu, getMenuStats, groupByDay } from "@/lib/data/menu";
import { getSettings } from "@/lib/data/camp";
import { HqHeading, Metric } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { PanelEmpty } from "@/components/shmifting/EmptyState";
import { CoverageBadges } from "@/components/hq/CoverageBadges";
import { StatusSwitch } from "./StatusSwitch";
import { AddMealForm } from "./AddMealForm";
import { Glyph } from "@/components/shmifting/Glyph";
import { RevealSwitch } from "./RevealSwitch";
import { mealTypeLabel, dishRoleLabel } from "@/lib/domain/categories";
import { hebrewDay, hebrewDate, cn } from "@/lib/utils";

export const metadata = { title: "תפריט — Kitchen HQ" };

/* ============================================================================
   MENU PLANNING — Bible §15, §17, §38

   Every meal shows its consequences next to it: who can eat it, who cannot,
   and what is still missing. Bible §17's readout ("46 diners / vegan ✓ /
   allergy conflict ⚠ 1") is attached to the row rather than hidden one click
   away, because a Kitchen Lead scanning the week needs to see the damage
   without opening anything.
   ========================================================================= */

export default async function MenuPage() {
  const [menu, stats, camp] = await Promise.all([
    getMenu(),
    getMenuStats(),
    getSettings(),
  ]);

  const days = groupByDay(menu);
  const defaultDate = (camp.festivalStart ?? new Date())
    .toISOString()
    .slice(0, 10);
  const locked = Boolean(camp.lockedAt);

  return (
    <div className="space-y-6">
      <HqHeading
        title="התפריט"
        lead="כל מה שנאכל, ומי יכול לאכול אותו. רק ארוחות סופיות נכנסות לקניות ולחבילת המטבח."
        action={!locked && <AddMealForm defaultDate={defaultDate} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="ארוחות מתוכננות"
          value={stats.total}
          sub={`${stats.final} סופיות`}
          accent="sun"
        />
        <Metric
          label="מנות"
          value={stats.dishesTotal}
          sub={`${stats.dishesWithRecipe} עם מתכון`}
          tone={
            stats.dishesTotal > stats.dishesWithRecipe ? "attention" : "done"
          }
          accent="terracotta"
          href="/hq/recipes"
        />
        <Metric
          label="בלי מה לאכול"
          value={stats.blockedDiners}
          sub="מקרים שדורשים תיקון"
          tone={stats.blockedDiners > 0 ? "alarm" : "done"}
          accent="pink"
        />
        <Metric
          label="בלי מנה עיקרית"
          value={stats.noMain}
          sub="יש להם רק תוספות"
          tone={stats.noMain > 0 ? "attention" : "done"}
          accent="peach"
        />
      </div>

      {/* Bible §16 — the reveal is a deliberate act, not a side effect. */}
      <RevealSwitch
        revealed={Boolean(camp.menuRevealedAt)}
        finalMeals={stats.final}
        locked={locked}
      />

      {menu.length === 0 ? (
        <PanelEmpty>
          עוד לא תוכננה אף ארוחה. כאן מתחיל הכל — הכמויות, הקניות והתקציב כולם
          נגזרים מהתפריט.
        </PanelEmpty>
      ) : (
        <div className="space-y-5">
          {days.map(({ date, items }) => (
            <Panel
              key={date.toISOString()}
              accent="sun"
              title={
                <span className="flex items-baseline gap-2">
                  {hebrewDay(date)}
                  <span className="text-[12.5px] font-normal text-cream-dim">
                    {hebrewDate(date)}
                  </span>
                </span>
              }
              action={
                <span className="text-[12.5px] text-cream-dim">
                  {items.length} ארוחות
                </span>
              }
            >
              <ul className="divide-y-2 divide-charcoal-4">
                {items.map((meal) => (
                  <li key={meal.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border-2 border-charcoal-5 px-1.5 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-cream-dim">
                            {mealTypeLabel(meal.mealType)}
                          </span>
                          <Link
                            href={`/hq/menu/${meal.id}`}
                            className="font-display text-lg text-cream transition-colors hover:text-sun"
                          >
                            {meal.title}
                          </Link>
                          {meal.overridesVote && (
                            <span
                              className="rounded border border-lavender/60 px-1.5 py-0.5 text-[11.5px] text-lavender"
                              title={meal.overrideReason ?? undefined}
                            >
                              שינוי מול ההצבעה
                            </span>
                          )}
                        </div>

                        {meal.concept && (
                          <p className="mt-1 max-w-2xl text-[13px] leading-snug text-cream-2/75">
                            {meal.concept}
                          </p>
                        )}

                        {meal.dishes.length > 0 ? (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {meal.dishes.map((dish) => (
                              <li
                                key={dish.id}
                                className={cn(
                                  "rounded border-2 px-2 py-0.5 text-[12.5px]",
                                  dish.recipe
                                    ? "border-charcoal-5 text-cream-2"
                                    : "border-attention/50 text-attention",
                                )}
                                title={
                                  dish.recipe ? undefined : "אין מתכון למנה הזו"
                                }
                              >
                                {dish.name}
                                <span className="ms-1 text-cream-dim">
                                  {dishRoleLabel(dish.role)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-attention">
                            <Glyph name="alert" strokeWidth={2.4} />
                            אין עדיין מנות בארוחה הזו
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusSwitch
                          mealId={meal.id}
                          status={meal.status}
                          disabled={locked}
                        />
                        <Link
                          href={`/hq/menu/${meal.id}`}
                          className="text-[12.5px] text-cream-dim underline transition-colors hover:text-sun"
                        >
                          לערוך את הארוחה
                        </Link>
                      </div>
                    </div>

                    <div className="mt-3">
                      <CoverageBadges
                        coverage={meal.coverage}
                        servings={meal.servings}
                        compact
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
