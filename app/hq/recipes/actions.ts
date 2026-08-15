"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { recipes, recipeItems, ingredients, dishes } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";
import { newId } from "@/lib/utils";
import { suggestAllergens } from "@/lib/domain/allergens";

export interface RecipeState {
  error?: string;
  ok?: boolean;
}

function touch() {
  revalidatePath("/hq/recipes", "layout");
  revalidatePath("/hq/menu", "layout");
  revalidatePath("/hq/shopping");
  revalidatePath("/hq/budget");
  revalidatePath("/hq/readiness");
  revalidatePath("/hq/allergies");
  revalidatePath("/hq/pack");
  revalidatePath("/hq");
  revalidatePath("/menu");
}

/* ---- recipes ------------------------------------------------------------ */

export async function createRecipe(formData: FormData): Promise<void> {
  await assertAdmin();
  const dishId = String(formData.get("dishId") ?? "");
  if (!dishId) return;

  const dish = await db.query.dishes.findFirst({ where: eq(dishes.id, dishId) });
  if (!dish) return;

  const existing = await db.query.recipes.findFirst({
    where: eq(recipes.dishId, dishId),
  });
  if (existing) {
    redirect(`/hq/recipes/${existing.id}`);
  }

  const id = newId();
  await db.insert(recipes).values({
    id,
    dishId,
    name: dish.name,
    baseServings: 8,
  });

  touch();
  redirect(`/hq/recipes/${id}`);
}

export async function updateRecipe(
  _prev: RecipeState,
  formData: FormData,
): Promise<RecipeState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "מתכון לא נמצא" };

  const baseServings = Number(formData.get("baseServings") ?? 0);
  if (!Number.isFinite(baseServings) || baseServings <= 0) {
    return { error: "מספר המנות הבסיסי חייב להיות גדול מאפס" };
  }

  await db
    .update(recipes)
    .set({
      name: String(formData.get("name") ?? "").trim() || "מתכון",
      baseServings: Math.round(baseServings),
      instructions: String(formData.get("instructions") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, id));

  touch();
  return { ok: true };
}

export async function setRecipeFinal(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const isFinal = String(formData.get("isFinal") ?? "") === "1";
  if (!id) return;

  await db
    .update(recipes)
    .set({ isFinal, updatedAt: new Date() })
    .where(eq(recipes.id, id));

  touch();
}

export async function deleteRecipe(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(recipes).where(eq(recipes.id, id));
  touch();
  redirect("/hq/recipes");
}

/* ---- ingredients & lines ------------------------------------------------ */

/* Bible §20: ingredients are reusable entities. Typing "עגבניות" when it
   already exists must reuse the existing row, or aggregation silently splits
   into two piles and the shopping list lies. */
export async function addRecipeItem(
  _prev: RecipeState,
  formData: FormData,
): Promise<RecipeState> {
  await assertAdmin();
  const recipeId = String(formData.get("recipeId") ?? "");
  const rawName = String(formData.get("ingredient") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const unit = String(formData.get("unit") ?? "kg");

  if (!recipeId) return { error: "מתכון לא נמצא" };
  if (!rawName) return { error: "צריך שם מרכיב" };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "כמות לא תקינה" };
  }

  let ingredient = await db.query.ingredients.findFirst({
    where: eq(ingredients.name, rawName),
  });

  if (!ingredient) {
    const cost = Number(formData.get("cost") ?? 0);
    const [created] = await db
      .insert(ingredients)
      .values({
        id: newId(),
        name: rawName,
        category: String(formData.get("category") ?? "other"),
        defaultUnit: unit,
        estimatedUnitCost: Number.isFinite(cost) && cost > 0 ? cost : 0,
        /* A suggestion, never a silent decision — the Lead can correct it in
           the ingredient row (Bible §11: never guess about safety). */
        allergens: suggestAllergens(rawName),
      })
      .returning();
    ingredient = created;
  }

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(recipeItems)
    .where(eq(recipeItems.recipeId, recipeId));

  await db.insert(recipeItems).values({
    id: newId(),
    recipeId,
    ingredientId: ingredient.id,
    quantity,
    unit,
    note: String(formData.get("note") ?? "").trim() || null,
    sortOrder: count,
  });

  touch();
  return { ok: true };
}

export async function updateRecipeItem(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const quantity = Number(formData.get("quantity") ?? 0);
  const overrideRaw = String(formData.get("scaledOverride") ?? "").trim();
  const scaledOverride = overrideRaw === "" ? null : Number(overrideRaw);

  await db
    .update(recipeItems)
    .set({
      ...(Number.isFinite(quantity) && quantity > 0 ? { quantity } : {}),
      unit: String(formData.get("unit") ?? "kg"),
      note: String(formData.get("note") ?? "").trim() || null,
      scaledOverride:
        scaledOverride !== null && Number.isFinite(scaledOverride) && scaledOverride >= 0
          ? scaledOverride
          : null,
    })
    .where(eq(recipeItems.id, id));

  touch();
}

/* Bible §23/§41: the calculated number is a suggestion. Clearing the override
   hands the line back to the maths. */
export async function clearItemOverride(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .update(recipeItems)
    .set({ scaledOverride: null })
    .where(eq(recipeItems.id, id));
  touch();
}

export async function deleteRecipeItem(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(recipeItems).where(eq(recipeItems.id, id));
  touch();
}

/* ---- the ingredient catalogue ------------------------------------------- */

export async function updateIngredient(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const cost = Number(formData.get("estimatedUnitCost") ?? 0);

  await db
    .update(ingredients)
    .set({
      name: String(formData.get("name") ?? "").trim() || "מרכיב",
      category: String(formData.get("category") ?? "other"),
      defaultUnit: String(formData.get("defaultUnit") ?? "kg"),
      estimatedUnitCost: Number.isFinite(cost) && cost >= 0 ? cost : 0,
      allergens: formData.getAll("allergens").map(String).filter(Boolean),
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .where(eq(ingredients.id, id));

  touch();
}
