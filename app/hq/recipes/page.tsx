import Link from "next/link";
import { getRecipes, getDishesWithoutRecipe } from "@/lib/data/recipes";
import { getSettings } from "@/lib/data/camp";
import { getMenuStats } from "@/lib/data/menu";
import { createRecipe } from "./actions";
import { HqHeading, Metric, Table, Th, Td, Tr } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { PanelEmpty } from "@/components/shmifting/EmptyState";
import { StatusChip } from "@/components/shmifting/Status";
import { Glyph } from "@/components/shmifting/Glyph";
import { scaleRecipe } from "@/lib/domain/scaling";
import { mealTypeLabel } from "@/lib/domain/categories";
import { hebrewDay, money, cn } from "@/lib/utils";

export const metadata = { title: "מתכונים — Kitchen HQ" };

/* ============================================================================
   RECIPES — Bible §18, §19

   "Recipes are operational kitchen objects, not merely content pages. They
    drive quantities, shopping, costs, and preparation."

   So the list leads with camp quantities and cost, not with recipe titles.
   Dishes missing a recipe come first, because that gap is what stops the
   shopping list from being real.
   ========================================================================= */

export default async function RecipesPage() {
  const [recipes, missing, camp, stats] = await Promise.all([
    getRecipes(),
    getDishesWithoutRecipe(),
    getSettings(),
    getMenuStats(),
  ]);

  const locked = Boolean(camp.lockedAt);

  const scaled = recipes.map((row) => ({
    ...row,
    scaledResult: scaleRecipe(
      row.recipe.baseServings,
      row.targetServings,
      row.recipe.items.map((item) => ({
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
    ),
  }));

  const totalCost = scaled.reduce((s, r) => s + r.scaledResult.totalCost, 0);

  return (
    <div className="space-y-6">
      <HqHeading
        title="מתכונים וכמויות"
        lead="כל מתכון נכתב בקנה מידה אנושי ומוכפל למספר הסועדים של הארוחה. אתם תמיד יכולים לעקוף את החישוב."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="מתכונים"
          value={recipes.length}
          sub={`${stats.recipesFinal} אושרו סופית`}
          accent="terracotta"
        />
        <Metric
          label="מנות בלי מתכון"
          value={missing.length}
          sub={missing.length > 0 ? "לא ייכנסו לרשימת הקניות" : "לכל מנה יש מתכון"}
          tone={missing.length > 0 ? "attention" : "done"}
          accent="sun"
        />
        <Metric
          label="שורות מרכיבים"
          value={recipes.reduce((s, r) => s + r.recipe.items.length, 0)}
          sub="בכל המתכונים"
          accent="dust-blue"
        />
        <Metric
          label="עלות המתכונים"
          value={money(totalCost, camp.currency)}
          sub="לפי הכמויות המוכפלות"
          accent="peach"
          href="/hq/budget"
        />
      </div>

      {missing.length > 0 && (
        <Panel title="מנות שמחכות למתכון" accent="sun">
          <ul className="divide-y divide-charcoal-4">
            {missing.map(({ dish, meal }) => (
              <li
                key={dish.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-display text-[15px] text-cream">
                    {dish.name}
                  </p>
                  <p className="text-[12.5px] text-cream-dim">
                    {meal.title} · {mealTypeLabel(meal.mealType)} ·{" "}
                    {hebrewDay(meal.date)}
                  </p>
                </div>
                {!locked && (
                  <form action={createRecipe}>
                    <input type="hidden" name="dishId" value={dish.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-[9px_11px_8px_10px] border-2 border-sun/60 bg-sun/10 px-3 py-1.5 text-[13px] font-medium text-sun transition-colors hover:bg-sun/20"
                    >
                      <Glyph name="plus" strokeWidth={2.5} />
                      ליצור מתכון
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="כל המתכונים" accent="terracotta">
        {scaled.length === 0 ? (
          <PanelEmpty>
            עוד אין מתכונים. מתכון הוא מה שהופך &quot;קארי עדשים&quot; לכמות
            עדשים שצריך לקנות.
          </PanelEmpty>
        ) : (
          <Table
            head={
              <>
                <Th>מתכון</Th>
                <Th>לאיזו ארוחה</Th>
                <Th numeric>בסיס</Th>
                <Th numeric>לקמפ</Th>
                <Th numeric>מרכיבים</Th>
                <Th numeric>עלות</Th>
                <Th>מצב</Th>
              </>
            }
          >
            {scaled.map(({ recipe, dish, meal, targetServings, scaledResult }) => {
              const overrides = scaledResult.items.filter((i) => i.isOverridden);
              return (
                <Tr key={recipe.id}>
                  <Td>
                    <Link
                      href={`/hq/recipes/${recipe.id}`}
                      className="font-medium text-cream transition-colors hover:text-sun"
                    >
                      {recipe.name}
                    </Link>
                    {overrides.length > 0 && (
                      <span className="ms-2 text-[11.5px] text-lavender">
                        {overrides.length} כמויות ידניות
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-[13px]">
                      {dish.name}
                      <span className="ms-1.5 text-cream-dim">
                        {meal.title} · {hebrewDay(meal.date)}
                      </span>
                    </span>
                  </Td>
                  <Td numeric>{recipe.baseServings}</Td>
                  <Td numeric>
                    <span className="font-display text-cream">
                      {targetServings}
                    </span>
                  </Td>
                  <Td numeric>
                    <span
                      className={cn(
                        recipe.items.length === 0 && "text-attention",
                      )}
                    >
                      {recipe.items.length}
                    </span>
                  </Td>
                  <Td numeric>{money(scaledResult.totalCost, camp.currency)}</Td>
                  <Td>
                    <StatusChip
                      tone={recipe.isFinal ? "done" : "idle"}
                      size="sm"
                    >
                      {recipe.isFinal ? "סופי" : "טיוטה"}
                    </StatusChip>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Panel>

      <p className="pb-4 text-center text-[12.5px] text-cream-dim">
        <Link href="/hq/shopping" className="underline hover:text-cream">
          כל המתכונים הסופיים מתאחדים לרשימת קניות אחת
        </Link>
      </p>
    </div>
  );
}
