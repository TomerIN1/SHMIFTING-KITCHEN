import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getBreakdown } from "@/lib/data/camp";
import { getMenu } from "@/lib/data/menu";
import { HqHeading, Metric } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { PanelEmpty } from "@/components/shmifting/EmptyState";
import { Glyph } from "@/components/shmifting/Glyph";
import { ReviewForm } from "./ReviewForm";
import { allergenLabel, severityLabel } from "@/lib/domain/allergens";
import { dishAllergens } from "@/lib/domain/coverage";
import { mealTypeLabel } from "@/lib/domain/categories";
import { hebrewDay, cn } from "@/lib/utils";

export const metadata = { title: "אלרגיות — Kitchen HQ" };

/* ============================================================================
   THE ALLERGY CENTER — Bible §11, CLAUDE.md §16, Design Book §43

   "Allergy information must be prominent when relevant. It must never become
    buried inside individual profiles."

   This screen answers all five of Bible §11's questions on one page:
   who, what, what they told us, which dishes conflict, and has it been
   reviewed. The conflicting-dishes column is the part that makes this
   operational rather than a list — it is computed live from the menu, so it
   updates the moment a recipe changes.

   Nothing here is playful. That is deliberate and permanent.
   ========================================================================= */

export default async function AllergiesPage() {
  const [rows, breakdown, menu] = await Promise.all([
    /* Only people who are actually coming. An allergy sheet that lists
       somebody who dropped out spends a Kitchen Lead's attention — and, in
       the printed pack, a cook's attention — on a risk that is not in the
       desert. Safety screens must be exactly true, not merely complete. */
    db.query.allergies.findMany({
      with: { user: true },
      where: (a, { exists, and, eq: equals, isNull: nul }) =>
        exists(
          db
            .select({ one: sql`1` })
            .from(users)
            .where(and(equals(users.id, a.userId), nul(users.notComingAt))),
        ),
    }),
    getBreakdown(),
    getMenu(),
  ]);

  /* For each allergen, which planned dishes carry it. */
  const dishesByAllergen = new Map<
    string,
    { mealId: string; mealTitle: string; date: Date; mealType: string; dish: string }[]
  >();

  for (const meal of menu) {
    for (const dish of meal.dishes) {
      const carried = dishAllergens({
        id: dish.id,
        name: dish.name,
        role: dish.role,
        dietary: dish.dietary,
        allergens: dish.allergens,
        ingredientAllergens: [
          ...new Set(
            (dish.recipe?.items ?? []).flatMap((i) => i.ingredient.allergens),
          ),
        ],
        hasRecipe: Boolean(dish.recipe),
      });
      for (const allergen of carried) {
        const list = dishesByAllergen.get(allergen) ?? [];
        list.push({
          mealId: meal.id,
          mealTitle: meal.title,
          date: meal.date,
          mealType: meal.mealType,
          dish: dish.name,
        });
        dishesByAllergen.set(allergen, list);
      }
    }
  }

  const ordered = [...rows].sort((a, b) => {
    /* Unreviewed first, then by severity. The Kitchen Lead's eye should land
       on the thing that is both dangerous and unhandled. */
    const aOpen = a.reviewedAt ? 1 : 0;
    const bOpen = b.reviewedAt ? 1 : 0;
    if (aOpen !== bOpen) return aOpen - bOpen;
    const weight = (s: string) =>
      s === "anaphylaxis" ? 0 : s === "severe" ? 1 : 2;
    return weight(a.severity) - weight(b.severity);
  });

  const unreviewed = ordered.filter((a) => !a.reviewedAt);

  return (
    <div className="space-y-6">
      <HqHeading
        title="מרכז האלרגיות"
        lead="כל מה שדווח, מי דיווח, ובאילו מנות זה מופיע. זה הדף היחיד במוצר שאסור לדלג עליו."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="אלרגיות שדווחו"
          value={breakdown.allergyCount}
          sub={`אצל ${breakdown.allergyPeople} אנשים`}
          accent="pink"
        />
        <Metric
          label="מחכות לבדיקה"
          value={breakdown.unreviewedAllergies}
          sub={
            breakdown.unreviewedAllergies === 0
              ? "הכל נבדק"
              : "אף אחת מהן לא נבדקה עדיין"
          }
          tone={breakdown.unreviewedAllergies > 0 ? "alarm" : "done"}
          accent="pink"
        />
        <Metric
          label="חמורות ומעלה"
          value={breakdown.severeAllergies}
          sub="דורשות כלים והפרדה"
          tone={breakdown.severeAllergies > 0 ? "alarm" : undefined}
          accent="terracotta"
        />
        <Metric
          label="אלרגנים בתפריט"
          value={dishesByAllergen.size}
          sub="סוגים שונים שמופיעים במנות"
          accent="sun"
          href="/hq/menu"
        />
      </div>

      {unreviewed.length > 0 && (
        <div className="rounded-md border-2 border-alarm border-s-[6px] border-s-alarm bg-alarm/[0.09] p-4">
          <p className="flex items-center gap-2 font-display text-[15px] text-alarm">
            <Glyph name="alert" strokeWidth={2.4} />
            {unreviewed.length} אלרגיות עדיין לא נבדקו
          </p>
          <p className="mt-1 text-sm leading-relaxed text-cream-2">
            &quot;נבדק&quot; לא אומר שפתרתם. זה אומר שקראתם, הבנתם, ויודעים מה
            עושים עם זה במטבח. אי אפשר לנעול את המטבח לפני שכולן נבדקו.
          </p>
        </div>
      )}

      <Panel title="כל האלרגיות" accent="pink">
        {ordered.length === 0 ? (
          <PanelEmpty>
            לא דווחו אלרגיות. זה יכול להיות מצוין — או שאנשים עוד לא מילאו את
            הפרופיל.
          </PanelEmpty>
        ) : (
          <ul className="divide-y-2 divide-charcoal-4">
            {ordered.map((allergy) => {
              const severity = severityLabel(allergy.severity);
              const critical = allergy.severity !== "avoid";
              const conflicts = dishesByAllergen.get(allergy.allergen) ?? [];

              return (
                <li
                  key={allergy.id}
                  className={cn(
                    "p-4",
                    !allergy.reviewedAt && critical && "bg-alarm/[0.05]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg text-cream">
                          {allergy.user.name}
                        </h3>
                        <span
                          className={cn(
                            "rounded border-2 px-2 py-0.5 text-[13px] font-semibold",
                            critical
                              ? "border-alarm bg-alarm/15 text-alarm"
                              : "border-attention bg-attention/10 text-attention",
                          )}
                        >
                          {allergenLabel(allergy.allergen, allergy.label)}
                        </span>
                        <span
                          className={cn(
                            "text-[13px] font-medium",
                            critical ? "text-alarm" : "text-attention",
                          )}
                        >
                          {severity.he}
                        </span>
                      </div>

                      <p
                        className={cn(
                          "mt-1.5 text-[13px] font-medium",
                          critical ? "text-alarm/90" : "text-cream-2/80",
                        )}
                      >
                        {severity.handling}
                      </p>

                      {allergy.details && (
                        <p className="mt-2 max-w-2xl rounded border-2 border-charcoal-4 bg-charcoal-3 p-2.5 text-sm leading-relaxed text-cream-2">
                          {allergy.details}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <ReviewForm
                        id={allergy.id}
                        reviewed={Boolean(allergy.reviewedAt)}
                        note={allergy.reviewNote}
                      />
                    </div>
                  </div>

                  {/* Bible §11: "Which meals or dishes potentially conflict?" */}
                  <div className="mt-3 border-t-2 border-dashed border-charcoal-4 pt-3">
                    {conflicts.length === 0 ? (
                      <p className="text-[13px] text-cream-dim">
                        לא נמצאה מנה מתוכננת שמכילה את זה.
                      </p>
                    ) : (
                      <>
                        <p className="mb-1.5 text-[12.5px] font-medium text-attention">
                          מופיע ב-{conflicts.length} מנות מתוכננות:
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {conflicts.map((c, i) => (
                            <li key={`${c.mealId}-${c.dish}-${i}`}>
                              <Link
                                href={`/hq/menu/${c.mealId}`}
                                className="inline-flex items-center gap-1.5 rounded border-2 border-charcoal-5 bg-charcoal-3 px-2 py-1 text-[12.5px] text-cream-2 transition-colors hover:border-attention hover:text-cream"
                              >
                                <span className="font-medium">{c.dish}</span>
                                <span className="text-cream-dim">
                                  {mealTypeLabel(c.mealType)} ·{" "}
                                  {hebrewDay(c.date)}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
