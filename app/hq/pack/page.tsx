import { getSettings, getPeople, getBreakdown } from "@/lib/data/camp";
import { getMenu, groupByDay } from "@/lib/data/menu";
import { getShifts } from "@/lib/data/shifts";
import { getRecipes } from "@/lib/data/recipes";
import { getShoppingList, groupByCategory } from "@/lib/data/shopping";
import { getBudget } from "@/lib/data/shopping";
import { getReadiness } from "@/lib/data/readiness";
import { PrintButton } from "./PrintButton";
import { HqHeading } from "@/components/hq/primitives";
import { Glyph } from "@/components/shmifting/Glyph";
import { scaleRecipe } from "@/lib/domain/scaling";
import { dishAllergens } from "@/lib/domain/coverage";
import {
  allergenLabel,
  severityLabel,
  dietaryLabel,
  restrictionLabel,
} from "@/lib/domain/allergens";
import {
  mealTypeLabel,
  dishRoleLabel,
  shiftTypeLabel,
  categoryLabel,
} from "@/lib/domain/categories";
import { unitLabel, formatQuantity } from "@/lib/domain/units";
import { hebrewFullDate, hebrewDay, hebrewDate, money } from "@/lib/utils";

export const metadata = { title: "חבילת המטבח — Kitchen HQ" };

/* ============================================================================
   THE KITCHEN MASTER PACK — Bible §33

   "Once the kitchen is ready, the system should generate a printable
    operational package. This is one of the most important outputs of the
    entire product."

   This page is the point of the whole thing. Bible §19/§20 say technology
   should disappear once the festival begins — this is the artefact that lets
   it. Everything needed to run the kitchen without a phone, on paper, in
   order: menu, shifts, recipes at camp quantities, allergy safety sheet,
   shopping/packing, checklist.

   The print stylesheet in globals.css strips the charcoal and the grain and
   leaves ink on paper. No PDF library — the browser already has one, and a
   dependency here would be a liability in a tent at 2am.
   ========================================================================= */

export default async function PackPage() {
  const [camp, people, breakdown, menu, shifts, recipes, shopping, budget, readiness] =
    await Promise.all([
      getSettings(),
      getPeople(),
      getBreakdown(),
      getMenu(),
      getShifts(),
      getRecipes(),
      getShoppingList(),
      getBudget(),
      getReadiness(),
    ]);

  const finalMeals = menu.filter((m) => m.status === "final");
  const menuDays = groupByDay(finalMeals);
  const shiftDays = groupByDay(shifts);
  const finalRecipes = recipes.filter((r) => r.meal.status === "final");

  /* One consolidated allergy sheet — the single page that must survive a
     kitchen with no reception (Bible §33, CLAUDE.md §16). */
  const allergyPeople = people
    .filter((p) => p.allergies.length > 0)
    .sort((a, b) => {
      const w = (x: typeof a) =>
        Math.max(
          ...x.allergies.map((al) =>
            al.severity === "anaphylaxis" ? 3 : al.severity === "severe" ? 2 : 1,
          ),
        );
      return w(b) - w(a);
    });

  const dietPeople = people.filter(
    (p) => p.profile && p.profile.dietaryPattern !== "omnivore",
  );

  return (
    <div className="space-y-6">
      <div className="no-print space-y-4">
        <HqHeading
          title="חבילת המטבח"
          lead="כל מה שצריך כדי להריץ את המטבח בלי טלפון. להדפיס, לשים בקלסר, לקחת למדבר."
          action={<PrintButton />}
        />

        <div className="rounded-md border-2 border-charcoal-4 border-s-[6px] border-s-sun bg-charcoal-2 p-4">
          <p className="font-display text-[15px] text-cream">
            מה נכנס לחבילה
          </p>
          <ul className="mt-2 grid gap-1 text-[13px] text-cream-2/85 sm:grid-cols-2">
            <li>· התפריט המלא לפי ימים ({finalMeals.length} ארוחות סופיות)</li>
            <li>· לוח משמרות עם שמות ({shifts.length} משמרות)</li>
            <li>· {finalRecipes.length} מתכונים בכמויות של הקמפ</li>
            <li>· דף בטיחות אלרגיות ({breakdown.allergyCount} דיווחים)</li>
            <li>· רשימת קניות ואריזה ({shopping.summary.total} פריטים)</li>
            <li>· צ׳קליסט המטבח</li>
          </ul>
          {readiness.blockers.length > 0 && (
            <p className="mt-3 flex items-start gap-2 text-[13px] text-attention">
              <Glyph name="alert" className="mt-0.5" strokeWidth={2.3} />
              <span>
                {readiness.blockers.length} דברים עוד לא סגורים. אפשר להדפיס
                בכל זאת — פשוט תדעו שהחבילה עדיין לא מלאה.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ===================== THE PACK ITSELF ========================== */}
      <article className="shm-paper shm-outline rounded-[16px_20px_14px_18px] p-6 text-ink sm:p-10 print:rounded-none print:border-0 print:p-0">
        {/* ---- COVER ---------------------------------------------------- */}
        <header className="print-page border-b-4 border-ink pb-6 text-center">
          <p className="font-display text-[13px] tracking-[0.3em] text-terracotta">
            SHMIFTING KITCHEN
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">
            חבילת המטבח
          </h1>
          <p className="mt-2 text-lg text-ink/70">מטבח {camp.campName}</p>
          <p className="mt-4 text-sm text-ink/60">
            {hebrewFullDate(camp.festivalStart)} – {hebrewFullDate(camp.festivalEnd)}
            {" · "}
            {camp.expectedDiners} סועדים
          </p>
          {camp.lockedAt && (
            <p className="mt-2 text-[13px] font-semibold text-ink">
              המטבח ננעל ב־{hebrewFullDate(camp.lockedAt)}
              {camp.lockedBy && ` · ${camp.lockedBy}`}
            </p>
          )}
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink/70">
            אם הכל כאן — אף אחד לא צריך טלפון כדי להאכיל את הקמפ הזה.
          </p>
        </header>

        {/* ---- 1. ALLERGY SAFETY (first, deliberately) ------------------ */}
        <Section title="בטיחות — אלרגיות ותזונה" number={1}>
          <p className="mb-4 border-2 border-ink bg-ink/[0.06] p-3 text-sm font-semibold leading-relaxed">
            הדף הזה נקרא לפני כל בישול. מי שנכנס למשמרת קורא אותו קודם.
          </p>

          {allergyPeople.length === 0 ? (
            <p className="text-sm text-ink/70">לא דווחו אלרגיות בקמפ הזה.</p>
          ) : (
            <div className="space-y-3">
              {allergyPeople.map((person) => (
                <div
                  key={person.id}
                  className="print-avoid-break border-2 border-ink p-3"
                >
                  <p className="font-display text-lg">{person.name}</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {person.allergies.map((a) => {
                      const sev = severityLabel(a.severity);
                      const critical = a.severity !== "avoid";
                      return (
                        <li key={a.id} className="text-sm">
                          <span
                            className={
                              critical
                                ? "inline-block border-2 border-ink bg-ink px-1.5 py-0.5 font-bold text-cream"
                                : "inline-block border-2 border-ink px-1.5 py-0.5 font-semibold"
                            }
                          >
                            {allergenLabel(a.allergen, a.label)} · {sev.he}
                          </span>
                          <span className="ms-2 font-medium">{sev.handling}</span>
                          {a.details && (
                            <span className="mt-0.5 block text-ink/75">
                              {a.details}
                            </span>
                          )}
                          {!a.reviewedAt && (
                            <span className="mt-0.5 block text-[12px] font-bold">
                              ⚠ לא נבדק על ידי מנהל.ת המטבח
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {dietPeople.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 font-display text-lg">תזונה מיוחדת</h3>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {dietPeople.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong> —{" "}
                    {dietaryLabel(p.profile!.dietaryPattern)}
                    {p.profile!.restrictions.length > 0 && (
                      <>
                        {" · "}
                        {p.profile!.restrictions
                          .map((r) => restrictionLabel(r))
                          .join(", ")}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* ---- 2. MENU --------------------------------------------------- */}
        <Section title="התפריט" number={2}>
          {menuDays.length === 0 ? (
            <p className="text-sm text-ink/70">אין עדיין ארוחות סופיות.</p>
          ) : (
            <div className="space-y-5">
              {menuDays.map((day) => (
                <div key={day.date.toISOString()} className="print-avoid-break">
                  <h3 className="mb-2 border-b-2 border-ink pb-1 font-display text-xl">
                    {hebrewDay(day.date)}
                    <span className="ms-2 text-base font-normal text-ink/60">
                      {hebrewDate(day.date)}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {day.items.map((meal) => (
                      <div key={meal.id}>
                        <p className="font-display text-base">
                          <span className="text-ink/60">
                            {mealTypeLabel(meal.mealType)}
                          </span>{" "}
                          — {meal.title}
                          <span className="ms-2 text-[13px] font-normal text-ink/60">
                            {meal.servings} מנות
                          </span>
                        </p>
                        {meal.concept && (
                          <p className="text-[13px] text-ink/70">
                            {meal.concept}
                          </p>
                        )}
                        <ul className="mt-1 grid gap-0.5 text-sm sm:grid-cols-2">
                          {meal.dishes.map((dish) => {
                            const carried = dishAllergens({
                              id: dish.id,
                              name: dish.name,
                              role: dish.role,
                              dietary: dish.dietary,
                              allergens: dish.allergens,
                              ingredientAllergens: [
                                ...new Set(
                                  (dish.recipe?.items ?? []).flatMap(
                                    (i) => i.ingredient.allergens,
                                  ),
                                ),
                              ],
                              hasRecipe: Boolean(dish.recipe),
                            });
                            return (
                              <li key={dish.id}>
                                · {dish.name}
                                <span className="text-ink/55">
                                  {" "}
                                  ({dishRoleLabel(dish.role)}
                                  {dish.dietary !== "omnivore" &&
                                    `, ${dietaryLabel(dish.dietary)}`}
                                  )
                                </span>
                                {carried.length > 0 && (
                                  <span className="font-semibold">
                                    {" "}
                                    [{carried.map((a) => allergenLabel(a)).join(", ")}]
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {meal.notes && (
                          <p className="mt-1 text-[13px] font-medium">
                            הערה: {meal.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ---- 3. SHIFTS -------------------------------------------------- */}
        <Section title="לוח משמרות" number={3}>
          {shiftDays.length === 0 ? (
            <p className="text-sm text-ink/70">לא נקבעו משמרות.</p>
          ) : (
            <div className="space-y-4">
              {shiftDays.map((day) => (
                <div key={day.date.toISOString()} className="print-avoid-break">
                  <h3 className="mb-1.5 border-b-2 border-ink pb-1 font-display text-lg">
                    {hebrewDay(day.date)}
                    <span className="ms-2 text-sm font-normal text-ink/60">
                      {hebrewDate(day.date)}
                    </span>
                  </h3>
                  <ul className="space-y-1.5">
                    {day.items.map((shift) => (
                      <li key={shift.id} className="text-sm">
                        <span className="font-semibold">
                          {shift.label || shiftTypeLabel(shift.mealType)}
                        </span>
                        <span className="ms-2 text-ink/60" dir="ltr">
                          {shift.startTime}–{shift.endTime}
                        </span>
                        <span className="ms-2">
                          {shift.assignments.length > 0
                            ? shift.assignments.map((a) => a.user.name).join(" · ")
                            : "— אף אחד לא שובץ —"}
                        </span>
                        {shift.missing > 0 && (
                          <span className="ms-2 font-bold">
                            (חסרים {shift.missing})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ---- 4. RECIPES ------------------------------------------------- */}
        <Section title="מתכונים — בכמויות של הקמפ" number={4}>
          {finalRecipes.length === 0 ? (
            <p className="text-sm text-ink/70">אין עדיין מתכונים בארוחות סופיות.</p>
          ) : (
            <div className="space-y-6">
              {finalRecipes.map(({ recipe, dish, meal, targetServings }) => {
                const scaled = scaleRecipe(
                  recipe.baseServings,
                  targetServings,
                  recipe.items.map((item) => ({
                    id: item.id,
                    ingredientId: item.ingredientId,
                    ingredientName: item.ingredient.name,
                    category: item.ingredient.category,
                    quantity: item.quantity,
                    unit: item.unit,
                    note: item.note,
                    scaledOverride: item.scaledOverride,
                    defaultUnit: item.ingredient.defaultUnit,
                    estimatedUnitCost: item.ingredient.estimatedUnitCost,
                    allergens: item.ingredient.allergens,
                  })),
                );
                const allergens = [
                  ...new Set(recipe.items.flatMap((i) => i.ingredient.allergens)),
                ];

                return (
                  <div
                    key={recipe.id}
                    className="print-avoid-break border-2 border-ink p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
                      <h3 className="font-display text-xl">{recipe.name}</h3>
                      <p className="text-sm text-ink/70">
                        {meal.title} · {hebrewDay(meal.date)} ·{" "}
                        <strong className="text-ink">{targetServings} מנות</strong>
                      </p>
                    </div>

                    {allergens.length > 0 && (
                      <p className="mt-2 border-2 border-ink bg-ink/[0.07] px-2 py-1 text-[13px] font-bold">
                        אלרגנים: {allergens.map((a) => allergenLabel(a)).join(" · ")}
                      </p>
                    )}

                    <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,17rem)_1fr]">
                      <div>
                        <h4 className="mb-1.5 font-display text-base">מרכיבים</h4>
                        <ul className="space-y-0.5 text-sm">
                          {scaled.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex justify-between gap-2 border-b border-ink/20 py-0.5"
                            >
                              <span>{item.ingredientName}</span>
                              <span className="shrink-0 font-semibold tabular-nums">
                                {formatQuantity(item.final)} {unitLabel(item.unit)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="mb-1.5 font-display text-base">הכנה</h4>
                        {recipe.instructions ? (
                          <ol className="space-y-1.5 text-sm leading-relaxed">
                            {recipe.instructions
                              .split("\n")
                              .filter(Boolean)
                              .map((step, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="shrink-0 font-bold tabular-nums">
                                    {i + 1}.
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                          </ol>
                        ) : (
                          <p className="text-sm text-ink/60">
                            לא נכתבו הוראות הכנה.
                          </p>
                        )}
                        {recipe.notes && (
                          <p className="mt-2 border-s-4 border-ink ps-2 text-[13px] font-medium">
                            {recipe.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ---- 5. SHOPPING & PACKING -------------------------------------- */}
        <Section title="קניות ואריזה" number={5}>
          <p className="mb-3 text-sm text-ink/70">
            {shopping.summary.bought} מתוך {shopping.summary.total} פריטים כבר
            נקנו. סמנו בעיפרון מה נארז ועלה לרכב.
          </p>
          <div className="space-y-4">
            {groupByCategory(shopping.rows).map(({ category, items }) => (
              <div key={category} className="print-avoid-break">
                <h3 className="mb-1.5 border-b-2 border-ink pb-1 font-display text-lg">
                  {categoryLabel(category)}
                </h3>
                <ul className="grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                  {items.map((row) => (
                    <li
                      key={row.ingredientId ?? row.id ?? row.name}
                      className="flex items-baseline justify-between gap-2 border-b border-ink/15 py-0.5"
                    >
                      <span className="flex items-baseline gap-1.5">
                        <span
                          aria-hidden
                          className="inline-block h-3 w-3 shrink-0 border-2 border-ink"
                        />
                        {row.name}
                        {row.assigneeName && (
                          <span className="text-ink/55">
                            ({row.assigneeName})
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatQuantity(row.finalQuantity)}{" "}
                        {unitLabel(row.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-4 border-t-2 border-ink pt-2 text-sm">
            תקציב: {money(budget.totalBudget, budget.currency)} · תחזית:{" "}
            {money(budget.projected, budget.currency)} · שולם עד כה:{" "}
            {money(budget.spent, budget.currency)}
          </p>
        </Section>

        {/* ---- 6. CHECKLIST ----------------------------------------------- */}
        <Section title="צ׳קליסט המטבח" number={6}>
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
            {[
              "כל האוכל נטען לרכב ומקורר כמו שצריך",
              "מים לשתייה ולבישול — מספיק לכל הימים",
              "גז מלא + מצת/גפרורים במקום יבש",
              "סירים, מחבתות, כפות גדולות, סכינים חדות",
              "קרש חיתוך נפרד לאלרגנים",
              "שולחן עבודה, כיור שטיפה, מים לשטיפת ידיים",
              "סבון כלים, ספוגים, מטליות, שקיות זבל",
              "כלי הגשה, צלחות, סכו״ם, כוסות",
              "קופסאות אחסון לשאריות",
              "עזרה ראשונה + אפיפן אם יש אלרגיה קשה בקמפ",
              "דף האלרגיות תלוי במקום גלוי במטבח",
              "לוח המשמרות תלוי במקום גלוי במטבח",
              "מישהו אחראי אש ומישהו אחראי מים",
              "פינת קפה עובדת מהבוקר הראשון",
            ].map((item) => (
              <li key={item} className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-3.5 shrink-0 border-2 border-ink"
                />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <footer className="mt-8 border-t-4 border-ink pt-5 text-center">
          <p className="font-display text-xl">
            אנחנו לא מחלקים דברים. אנחנו מחלקים רגעים.
          </p>
          <p className="mt-2 text-sm text-ink/60">
            עכשיו אפשר לכבות את הטלפונים.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Section({
  title,
  number,
  children,
}: {
  title: string;
  number: number;
  children: React.ReactNode;
}) {
  return (
    <section className="print-page mt-8 pt-2">
      <h2 className="mb-4 flex items-baseline gap-3 border-b-4 border-ink pb-2 font-display text-2xl">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink text-base tabular-nums">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
