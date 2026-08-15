import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { meals } from "@/lib/db/schema";
import { analyseMeal, type DishInput, type MealCoverage } from "@/lib/domain/coverage";
import { mealTypeOrder } from "@/lib/domain/categories";
import { getDiners, getSettings, defaultDiners } from "./camp";

/* ============================================================================
   THE MENU, WITH ITS CONSEQUENCES ALREADY WORKED OUT

   Bible §22/§42: "Do the boring calculation so the humans can make the
   meaningful decision." A meal is never handed to a page as raw rows — it
   arrives already knowing how many people can eat it, which allergens it
   carries, and who has nothing to eat.
   ========================================================================= */

export const getMenu = cache(async () => {
  const camp = await getSettings();
  const diners = await getDiners();
  const campDiners = await defaultDiners();

  const rows = await db.query.meals.findMany({
    orderBy: [asc(meals.date)],
    with: {
      dishes: {
        with: {
          recipe: { with: { items: { with: { ingredient: true } } } },
        },
      },
    },
  });

  const sorted = [...rows].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    return mealTypeOrder(a.mealType) - mealTypeOrder(b.mealType);
  });

  return sorted.map((meal) => {
    const dishInputs: DishInput[] = meal.dishes.map((dish) => ({
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
    }));

    const servings = meal.expectedDiners ?? campDiners;
    const coverage = analyseMeal(dishInputs, diners);

    return { ...meal, servings, coverage, dishInputs };
  });
});

export type MenuMeal = Awaited<ReturnType<typeof getMenu>>[number];

export const getMenuStats = cache(async () => {
  const menu = await getMenu();
  return {
    total: menu.length,
    final: menu.filter((m) => m.status === "final").length,
    withDishes: menu.filter((m) => m.dishes.length > 0).length,
    blockedDiners: menu.reduce((s, m) => s + m.coverage.blockedCount, 0),
    noMain: menu.reduce((s, m) => s + m.coverage.noMainCount, 0),
    dishesTotal: menu.reduce((s, m) => s + m.dishes.length, 0),
    dishesWithRecipe: menu.reduce(
      (s, m) => s + m.dishes.filter((d) => d.recipe).length,
      0,
    ),
    recipesTotal: menu.reduce(
      (s, m) => s + m.dishes.filter((d) => d.recipe).length,
      0,
    ),
    recipesFinal: menu.reduce(
      (s, m) => s + m.dishes.filter((d) => d.recipe?.isFinal).length,
      0,
    ),
  };
});

/** Group the menu by day — the shape both the reveal and the print pack want. */
export function groupByDay<T extends { date: Date }>(items: T[]) {
  const days = new Map<string, { date: Date; items: T[] }>();
  for (const item of items) {
    const key = `${item.date.getFullYear()}-${item.date.getMonth()}-${item.date.getDate()}`;
    const bucket = days.get(key);
    if (bucket) bucket.items.push(item);
    else days.set(key, { date: item.date, items: [item] });
  }
  return [...days.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

export type { MealCoverage };
