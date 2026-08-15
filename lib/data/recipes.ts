import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";
import { getMenu } from "./menu";

/* ============================================================================
   RECIPES, ALWAYS SEEN AT CAMP SCALE

   A recipe on its own is only half the information. What the Kitchen Lead
   needs is the recipe *for this meal*, which means the target serving count
   travels with it everywhere (Bible §19).
   ========================================================================= */

export const getRecipes = cache(async () => {
  const menu = await getMenu();

  return menu.flatMap((meal) =>
    meal.dishes
      .filter((dish) => dish.recipe)
      .map((dish) => ({
        recipe: dish.recipe!,
        dish,
        meal,
        targetServings: meal.servings,
      })),
  );
});

export type RecipeRow = Awaited<ReturnType<typeof getRecipes>>[number];

export const getRecipe = cache(async (recipeId: string) => {
  const all = await getRecipes();
  return all.find((r) => r.recipe.id === recipeId) ?? null;
});

/** Dishes still missing a recipe — the gap between a menu and a kitchen. */
export const getDishesWithoutRecipe = cache(async () => {
  const menu = await getMenu();
  return menu.flatMap((meal) =>
    meal.dishes
      .filter((dish) => !dish.recipe)
      .map((dish) => ({ dish, meal })),
  );
});

export const getIngredients = cache(async () => {
  return db.query.ingredients.findMany({
    orderBy: [asc(ingredients.name)],
  });
});
