import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ingredients, recipes, dishes } from "@/lib/db/schema";
import { getMenu } from "./menu";
import { defaultDiners } from "./camp";

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

/* ---------------------------------------------------------------------------
   RECIPES ON EVENINGS THAT HAVE NOT WON YET

   getRecipes() walks the MENU, and must keep doing so: it feeds the shopping
   list, the budget and the printed pack, and a proposal must never reach any
   of them. But the Kitchen Lead still has to be able to open and edit the
   recipe they are costing, so the single-recipe lookup searches wider than
   the aggregate does.

   The serving count is the difference that matters. A meal knows how many
   people it feeds; a proposal does not exist on a date yet, so it is costed
   against the camp head count — which is what it would be cooked for if it
   won. That makes the number on the screen the real answer to "what would
   this evening cost us".
   ------------------------------------------------------------------------ */

export const getProposalRecipe = cache(async (recipeId: string) => {
  const row = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    with: {
      items: { with: { ingredient: true } },
      dish: { with: { voteOption: true } },
    },
  });

  if (!row?.dish?.voteOptionId || !row.dish.voteOption) return null;

  return {
    recipe: row,
    dish: row.dish,
    voteOption: row.dish.voteOption,
    targetServings: await defaultDiners(),
  };
});

/** Every dish costed against an evening the camp is still voting on. */
export const getOptionDishes = cache(async (voteOptionId: string) => {
  return db.query.dishes.findMany({
    where: eq(dishes.voteOptionId, voteOptionId),
    orderBy: [asc(dishes.sortOrder)],
    with: { recipe: { with: { items: { with: { ingredient: true } } } } },
  });
});
