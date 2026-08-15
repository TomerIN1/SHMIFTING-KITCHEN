import Link from "next/link";
import { notFound } from "next/navigation";
import { getMenu } from "@/lib/data/menu";
import { getSettings } from "@/lib/data/camp";
import { HqHeading } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { Glyph } from "@/components/shmifting/Glyph";
import {
  CoverageBadges,
  ConflictList,
  AllergensPresent,
} from "@/components/hq/CoverageBadges";
import { StatusSwitch } from "../StatusSwitch";
import { DishList, type DishView } from "./DishEditor";
import { MealSettings } from "./MealSettings";
import { mealTypeLabel } from "@/lib/domain/categories";
import { hebrewFullDate } from "@/lib/utils";

/* ============================================================================
   ONE MEAL — where a coverage problem actually gets fixed.

   The page is ordered by what a Kitchen Lead does: read the damage, change
   the dishes, then adjust the details. Settings sit last because they are the
   least common reason to open this page.
   ========================================================================= */

export default async function MealPage({ params }: PageProps<"/hq/menu/[id]">) {
  const { id } = await params;
  const [menu, camp] = await Promise.all([getMenu(), getSettings()]);
  const meal = menu.find((m) => m.id === id);
  if (!meal) notFound();

  const locked = Boolean(camp.lockedAt);

  const dishViews: DishView[] = meal.dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    role: dish.role,
    dietary: dish.dietary,
    allergens: dish.allergens,
    notes: dish.notes,
    recipeId: dish.recipe?.id ?? null,
    recipeName: dish.recipe?.name ?? null,
    ingredientAllergens: [
      ...new Set((dish.recipe?.items ?? []).flatMap((i) => i.ingredient.allergens)),
    ],
  }));

  return (
    <div className="space-y-5">
      <Link
        href="/hq/menu"
        className="inline-flex items-center gap-1.5 text-[13px] text-cream-dim transition-colors hover:text-cream"
      >
        <Glyph name="arrow" strokeWidth={2.2} />
        לכל התפריט
      </Link>

      <HqHeading
        title={meal.title}
        lead={`${mealTypeLabel(meal.mealType)} · ${hebrewFullDate(meal.date)}`}
        action={
          <StatusSwitch mealId={meal.id} status={meal.status} disabled={locked} />
        }
      />

      {/* ---- The damage report ------------------------------------------- */}
      <Panel title="מי יכול לאכול את זה" accent="pink">
        <div className="space-y-3 p-4">
          <CoverageBadges coverage={meal.coverage} servings={meal.servings} />
          <ConflictList coverage={meal.coverage} />
          <AllergensPresent
            allergens={meal.coverage.allergensPresent}
            href="/hq/allergies"
          />
          {meal.coverage.conflicts.length === 0 &&
            meal.dishes.length > 0 && (
              <p className="flex items-center gap-2 text-[13px] text-good">
                <Glyph name="check" strokeWidth={2.5} />
                לכל אחד בקמפ יש כאן משהו לאכול, כולל מנה עיקרית.
              </p>
            )}
        </div>
      </Panel>

      {/* ---- The dishes --------------------------------------------------- */}
      <Panel
        title="מנות"
        accent="sun"
        action={
          <span className="text-[12.5px] text-cream-dim">
            {meal.dishes.length} מנות ·{" "}
            {meal.dishes.filter((d) => d.recipe).length} עם מתכון
          </span>
        }
      >
        <div className="p-4">
          <DishList mealId={meal.id} dishes={dishViews} locked={locked} />
        </div>
      </Panel>

      {/* ---- Details ------------------------------------------------------ */}
      <Panel title="פרטי הארוחה" accent="dust-blue">
        <div className="p-4">
          <MealSettings
            meal={{
              id: meal.id,
              title: meal.title,
              concept: meal.concept,
              notes: meal.notes,
              mealType: meal.mealType,
              date: meal.date.toISOString().slice(0, 10),
              expectedDiners: meal.expectedDiners,
              overrideReason: meal.overrideReason,
            }}
            campDiners={camp.expectedDiners}
            locked={locked}
          />
        </div>
      </Panel>
    </div>
  );
}
