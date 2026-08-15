import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  aggregateIngredients,
  buildShoppingList,
  summariseShopping,
  type RecipeLineForShopping,
  type ShoppingRow,
} from "@/lib/domain/shopping";
import { categoryOrder } from "@/lib/domain/categories";
import { getMenu } from "./menu";
import { getSettings, defaultDiners } from "./camp";

/* ============================================================================
   THE MASTER SHOPPING LIST — Bible §26

   Only FINAL meals feed the list. That is a deliberate product decision, not
   a limitation: buying nine kilos of tomatoes for a dinner that is still an
   idea is exactly the kind of error Bible §40 asks the product to prevent.

   Meals that are still proposed or under review are reported separately as
   "pending", so the Kitchen Lead can see what the list will become without
   the list ever lying about what has been decided.
   ========================================================================= */

async function recipeLines(): Promise<{
  final: RecipeLineForShopping[];
  pendingMeals: number;
  pendingLines: number;
}> {
  const menu = await getMenu();
  const final: RecipeLineForShopping[] = [];
  let pendingMeals = 0;
  let pendingLines = 0;

  for (const meal of menu) {
    const isFinal = meal.status === "final";
    if (!isFinal) pendingMeals++;

    for (const dish of meal.dishes) {
      if (!dish.recipe) continue;
      for (const item of dish.recipe.items) {
        if (!isFinal) {
          pendingLines++;
          continue;
        }
        final.push({
          mealId: meal.id,
          mealTitle: meal.title,
          mealDate: meal.date,
          mealStatus: meal.status,
          dishName: dish.name,
          recipeName: dish.recipe.name,
          baseServings: dish.recipe.baseServings,
          targetServings: meal.servings,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredient.name,
          category: item.ingredient.category,
          defaultUnit: item.ingredient.defaultUnit,
          estimatedUnitCost: item.ingredient.estimatedUnitCost,
          allergens: item.ingredient.allergens,
          quantity: item.quantity,
          unit: item.unit,
          scaledOverride: item.scaledOverride,
        });
      }
    }
  }

  return { final, pendingMeals, pendingLines };
}

export const getShoppingList = cache(async () => {
  const { final, pendingMeals, pendingLines } = await recipeLines();
  const aggregated = aggregateIngredients(final);

  const rows = await db.query.shoppingItems.findMany({
    with: { assignee: true },
  });

  const list = buildShoppingList(
    aggregated,
    rows.map((r) => ({
      id: r.id,
      ingredientId: r.ingredientId,
      name: r.name,
      category: r.category,
      unit: r.unit,
      manualQuantity: r.manualQuantity,
      quantityOverride: r.quantityOverride,
      estimatedUnitCost: r.estimatedUnitCost,
      actualCost: r.actualCost,
      status: r.status,
      assigneeId: r.assigneeId,
      assigneeName: r.assignee?.name ?? null,
      notes: r.notes,
      isManual: r.isManual,
    })),
  );

  const sorted = [...list].sort((a, b) => {
    const byCat = categoryOrder(a.category) - categoryOrder(b.category);
    if (byCat !== 0) return byCat;
    return a.name.localeCompare(b.name, "he");
  });

  return {
    rows: sorted,
    summary: summariseShopping(sorted),
    pendingMeals,
    pendingLines,
  };
});

export function groupByCategory(rows: ShoppingRow[]) {
  const groups = new Map<string, ShoppingRow[]>();
  for (const row of rows) {
    const list = groups.get(row.category) ?? [];
    list.push(row);
    groups.set(row.category, list);
  }
  return [...groups.entries()]
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category));
}

/* --- BUDGET — Bible §24, §25 -------------------------------------------- */

export const getBudget = cache(async () => {
  const camp = await getSettings();
  const diners = await defaultDiners();
  const { rows, summary } = await getShoppingList();

  const totalBudget = camp.budgetPerPerson * diners;
  const projected = summary.estimatedTotal;
  const spent = rows
    .filter((r) => r.status === "bought")
    .reduce((s, r) => s + (r.actualCost ?? r.estimatedCost), 0);

  const byCategory = new Map<string, { projected: number; actual: number }>();
  for (const row of rows) {
    const entry = byCategory.get(row.category) ?? { projected: 0, actual: 0 };
    entry.projected += row.estimatedCost;
    if (row.status === "bought") entry.actual += row.actualCost ?? row.estimatedCost;
    byCategory.set(row.category, entry);
  }

  return {
    currency: camp.currency,
    diners,
    perPerson: camp.budgetPerPerson,
    totalBudget,
    projected,
    spent,
    /* Everything still to buy, at estimate. */
    committed: projected - spent,
    remaining: totalBudget - projected,
    overBudget: totalBudget > 0 && projected > totalBudget,
    projectedPerPerson: diners
      ? projected / diners
      : 0,
    reviewed: Boolean(camp.budgetReviewedAt),
    categories: [...byCategory.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.projected - a.projected),
    summary,
  };
});
