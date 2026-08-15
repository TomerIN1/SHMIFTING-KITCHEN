"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { shoppingItems, ingredients } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";
import { newId } from "@/lib/utils";

export interface ShoppingState {
  error?: string;
  ok?: boolean;
}

function touch() {
  revalidatePath("/hq/shopping");
  revalidatePath("/hq/budget");
  revalidatePath("/hq/readiness");
  revalidatePath("/hq/pack");
  revalidatePath("/hq");
}

/* Recipe-derived rows do not exist in the table until a human touches them —
   the list is computed. The first edit materialises the row that stores what
   the human decided (Bible §23), and nothing else. */
async function ensureRow(
  rowId: string | null,
  ingredientId: string | null,
): Promise<string | null> {
  if (rowId) return rowId;
  if (!ingredientId) return null;

  const existing = await db.query.shoppingItems.findFirst({
    where: eq(shoppingItems.ingredientId, ingredientId),
  });
  if (existing) return existing.id;

  const ingredient = await db.query.ingredients.findFirst({
    where: eq(ingredients.id, ingredientId),
  });
  if (!ingredient) return null;

  const id = newId();
  await db.insert(shoppingItems).values({
    id,
    ingredientId,
    name: ingredient.name,
    category: ingredient.category,
    unit: ingredient.defaultUnit,
    isManual: false,
    status: "needed",
  });
  return id;
}

export async function setItemStatus(formData: FormData): Promise<void> {
  await assertAdmin();
  const status = String(formData.get("status") ?? "needed");
  if (!["needed", "assigned", "bought"].includes(status)) return;

  const id = await ensureRow(
    String(formData.get("rowId") ?? "") || null,
    String(formData.get("ingredientId") ?? "") || null,
  );
  if (!id) return;

  await db
    .update(shoppingItems)
    .set({
      status: status as "needed" | "assigned" | "bought",
      updatedAt: new Date(),
    })
    .where(eq(shoppingItems.id, id));

  touch();
}

export async function setItemAssignee(formData: FormData): Promise<void> {
  await assertAdmin();
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;

  const id = await ensureRow(
    String(formData.get("rowId") ?? "") || null,
    String(formData.get("ingredientId") ?? "") || null,
  );
  if (!id) return;

  const current = await db.query.shoppingItems.findFirst({
    where: eq(shoppingItems.id, id),
  });

  await db
    .update(shoppingItems)
    .set({
      assigneeId,
      /* Bible §28: needed → assigned → bought. Naming somebody moves it
         along; already-bought items stay bought. */
      status:
        current?.status === "bought"
          ? "bought"
          : assigneeId
            ? "assigned"
            : "needed",
      updatedAt: new Date(),
    })
    .where(eq(shoppingItems.id, id));

  touch();
}

export async function setItemNumbers(
  _prev: ShoppingState,
  formData: FormData,
): Promise<ShoppingState> {
  await assertAdmin();

  const id = await ensureRow(
    String(formData.get("rowId") ?? "") || null,
    String(formData.get("ingredientId") ?? "") || null,
  );
  if (!id) return { error: "פריט לא נמצא" };

  const overrideRaw = String(formData.get("quantityOverride") ?? "").trim();
  const actualRaw = String(formData.get("actualCost") ?? "").trim();
  const manualRaw = String(formData.get("manualQuantity") ?? "").trim();

  const quantityOverride = overrideRaw === "" ? null : Number(overrideRaw);
  const actualCost = actualRaw === "" ? null : Number(actualRaw);
  const manualQuantity = manualRaw === "" ? null : Number(manualRaw);

  if (quantityOverride !== null && (!Number.isFinite(quantityOverride) || quantityOverride < 0)) {
    return { error: "כמות לא תקינה" };
  }
  if (actualCost !== null && (!Number.isFinite(actualCost) || actualCost < 0)) {
    return { error: "עלות לא תקינה" };
  }

  await db
    .update(shoppingItems)
    .set({
      quantityOverride,
      actualCost,
      ...(manualQuantity !== null && Number.isFinite(manualQuantity)
        ? { manualQuantity }
        : {}),
      notes: String(formData.get("notes") ?? "").trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(shoppingItems.id, id));

  touch();
  return { ok: true };
}

/* Bible §29 — paper towels, bin bags, foil. Never recipe-derived. */
export async function addManualItem(
  _prev: ShoppingState,
  formData: FormData,
): Promise<ShoppingState> {
  await assertAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const cost = Number(formData.get("cost") ?? 0);

  if (!name) return { error: "צריך שם לפריט" };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "כמות לא תקינה" };
  }

  await db.insert(shoppingItems).values({
    id: newId(),
    name,
    category: String(formData.get("category") ?? "supplies"),
    unit: String(formData.get("unit") ?? "unit"),
    manualQuantity: quantity,
    estimatedUnitCost: Number.isFinite(cost) && cost >= 0 ? cost : 0,
    isManual: true,
    status: "needed",
  });

  touch();
  return { ok: true };
}

export async function deleteManualItem(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const row = await db.query.shoppingItems.findFirst({
    where: eq(shoppingItems.id, id),
  });
  /* Only manual rows can be deleted — a recipe-derived row would simply
     reappear on the next read, which would be baffling. */
  if (!row?.isManual) return;

  await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
  touch();
}
