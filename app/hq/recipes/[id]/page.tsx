import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe, getIngredients } from "@/lib/data/recipes";
import { getSettings } from "@/lib/data/camp";
import { setRecipeFinal } from "../actions";
import { RecipeSettings } from "./RecipeSettings";
import { ItemRow, AddItemForm } from "./ItemRow";
import { HqHeading, Table, Th, Metric } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { Glyph } from "@/components/shmifting/Glyph";
import { StatusChip } from "@/components/shmifting/Status";
import { scaleRecipe } from "@/lib/domain/scaling";
import { mealTypeLabel } from "@/lib/domain/categories";
import { allergenLabel } from "@/lib/domain/allergens";
import { hebrewDay, money } from "@/lib/utils";

/* ============================================================================
   ONE RECIPE, AT CAMP SCALE — Bible §18, §19, §23
   ========================================================================= */

export default async function RecipePage({
  params,
}: PageProps<"/hq/recipes/[id]">) {
  const { id } = await params;
  const [row, camp, allIngredients] = await Promise.all([
    getRecipe(id),
    getSettings(),
    getIngredients(),
  ]);
  if (!row) notFound();

  const { recipe, dish, meal, targetServings } = row;
  const locked = Boolean(camp.lockedAt);

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
    <div className="space-y-5">
      <Link
        href="/hq/recipes"
        className="inline-flex items-center gap-1.5 text-[13px] text-cream-dim transition-colors hover:text-cream"
      >
        <Glyph name="arrow" strokeWidth={2.2} />
        לכל המתכונים
      </Link>

      <HqHeading
        title={recipe.name}
        lead={
          <>
            {dish.name} · {meal.title} · {mealTypeLabel(meal.mealType)} ·{" "}
            <Link href={`/hq/menu/${meal.id}`} className="underline hover:text-cream">
              {hebrewDay(meal.date)}
            </Link>
          </>
        }
        action={
          !locked && (
            <form action={setRecipeFinal}>
              <input type="hidden" name="id" value={recipe.id} />
              <input
                type="hidden"
                name="isFinal"
                value={recipe.isFinal ? "0" : "1"}
              />
              <button
                type="submit"
                className={
                  recipe.isFinal
                    ? "flex items-center gap-1.5 rounded-[10px_12px_9px_11px] border-2 border-good bg-good/15 px-3 py-2 text-sm font-medium text-good"
                    : "flex items-center gap-1.5 rounded-[10px_12px_9px_11px] border-2 border-charcoal-5 px-3 py-2 text-sm font-medium text-cream-2 transition-colors hover:border-good hover:text-good"
                }
              >
                <Glyph name="check" strokeWidth={2.5} />
                {recipe.isFinal ? "המתכון אושר" : "לאשר את המתכון"}
              </button>
            </form>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="מתכון בסיס"
          value={`${recipe.baseServings} מנות`}
          sub="כפי שכתוב במקור"
          accent="cream"
        />
        <Metric
          label="צריך להכין"
          value={`${targetServings} מנות`}
          sub={`מכפילים ×${scaled.factor.toFixed(2)}`}
          accent="sun"
        />
        <Metric
          label="מרכיבים"
          value={recipe.items.length}
          sub={
            scaled.items.filter((i) => i.isOverridden).length > 0
              ? `${scaled.items.filter((i) => i.isOverridden).length} כמויות ידניות`
              : "הכל לפי החישוב"
          }
          accent="dust-blue"
        />
        <Metric
          label="עלות משוערת"
          value={money(scaled.totalCost, camp.currency)}
          sub={`${money(targetServings ? scaled.totalCost / targetServings : 0, camp.currency)} למנה`}
          accent="peach"
        />
      </div>

      {allergens.length > 0 && (
        <div className="rounded-md border-2 border-attention/55 border-s-[6px] border-s-attention bg-attention/[0.07] p-3">
          <p className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="flex items-center gap-1.5 font-display text-attention">
              <Glyph name="alert" strokeWidth={2.4} />
              אלרגנים במתכון הזה
            </span>
            {allergens.map((a) => (
              <span
                key={a}
                className="rounded border border-attention/60 bg-attention/10 px-1.5 py-0.5 text-[12.5px] text-attention"
              >
                {allergenLabel(a)}
              </span>
            ))}
          </p>
          <p className="mt-1 text-[12.5px] text-cream-2/75">
            הרשימה נגזרת מהמרכיבים ומתעדכנת לבד. היא מופיעה גם ב
            <Link href="/hq/allergies" className="underline hover:text-cream">
              מרכז האלרגיות
            </Link>{" "}
            ובחבילת המטבח המודפסת.
          </p>
        </div>
      )}

      <Panel
        title="מרכיבים וכמויות"
        accent="terracotta"
        action={
          <StatusChip tone={recipe.isFinal ? "done" : "idle"} size="sm">
            {recipe.isFinal ? "סופי" : "טיוטה"}
          </StatusChip>
        }
      >
        {recipe.items.length === 0 ? (
          <p className="px-4 pt-4 text-center text-sm text-cream-dim">
            אין עדיין מרכיבים. בלי מרכיבים המתכון לא מייצר כמויות ולא מגיע
            לרשימת הקניות.
          </p>
        ) : (
          <Table
            head={
              <>
                <Th>מרכיב</Th>
                <Th numeric>לבסיס</Th>
                <Th numeric>חישוב</Th>
                <Th numeric>לקמפ</Th>
                <Th numeric>עלות</Th>
                <Th numeric />
              </>
            }
          >
            {scaled.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                currency={camp.currency}
                locked={locked}
              />
            ))}
          </Table>
        )}

        {!locked && (
          <AddItemForm
            recipeId={recipe.id}
            knownIngredients={allIngredients.map((i) => ({
              name: i.name,
              defaultUnit: i.defaultUnit,
              category: i.category,
            }))}
          />
        )}
      </Panel>

      <Panel title="הוראות הכנה" accent="sun">
        <div className="p-4">
          <RecipeSettings
            recipe={{
              id: recipe.id,
              name: recipe.name,
              baseServings: recipe.baseServings,
              instructions: recipe.instructions,
              notes: recipe.notes,
            }}
            locked={locked}
          />
        </div>
      </Panel>
    </div>
  );
}
