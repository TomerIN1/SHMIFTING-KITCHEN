"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { meals, dishes } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";
import { newId } from "@/lib/utils";

export interface MenuState {
  error?: string;
  ok?: boolean;
}

function touch() {
  revalidatePath("/hq/menu", "layout");
  revalidatePath("/hq/recipes", "layout");
  revalidatePath("/hq/shopping");
  revalidatePath("/hq/budget");
  revalidatePath("/hq/readiness");
  revalidatePath("/hq");
  revalidatePath("/menu");
  revalidatePath("/");
}

/* ---- meals -------------------------------------------------------------- */

const mealSchema = z.object({
  date: z.string().min(1, "צריך תאריך"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title: z.string().trim().min(1, "צריך שם לארוחה"),
  concept: z.string().trim().max(400).optional(),
});

export async function createMeal(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  await assertAdmin();
  const parsed = mealSchema.safeParse({
    date: formData.get("date"),
    mealType: formData.get("mealType"),
    title: formData.get("title"),
    concept: formData.get("concept") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const date = new Date(`${parsed.data.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { error: "תאריך לא תקין" };

  await db.insert(meals).values({
    id: newId(),
    date,
    mealType: parsed.data.mealType,
    title: parsed.data.title,
    concept: parsed.data.concept || null,
    status: "proposed",
  });

  touch();
  return { ok: true };
}

export async function updateMeal(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ארוחה לא נמצאה" };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "צריך שם לארוחה" };

  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00`) : null;

  const dinersRaw = String(formData.get("expectedDiners") ?? "").trim();
  const expectedDiners = dinersRaw ? Number(dinersRaw) : null;
  if (expectedDiners !== null && (!Number.isFinite(expectedDiners) || expectedDiners < 0)) {
    return { error: "מספר סועדים לא תקין" };
  }

  await db
    .update(meals)
    .set({
      title,
      concept: String(formData.get("concept") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      mealType: String(formData.get("mealType") ?? "dinner") as
        | "breakfast"
        | "lunch"
        | "dinner"
        | "snack",
      expectedDiners,
      ...(date && !Number.isNaN(date.getTime()) ? { date } : {}),
      updatedAt: new Date(),
    })
    .where(eq(meals.id, id));

  touch();
  return { ok: true };
}

/* Bible §38: proposed → review → final. Only `final` reaches the shopping
   list and the printed pack, so this transition genuinely matters. */
export async function setMealStatus(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["proposed", "review", "final"].includes(status)) return;

  await db
    .update(meals)
    .set({ status: status as "proposed" | "review" | "final", updatedAt: new Date() })
    .where(eq(meals.id, id));

  touch();
}

export async function deleteMeal(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(meals).where(eq(meals.id, id));
  touch();
  redirect("/hq/menu");
}

/* Bible §13/§23: the Lead may knowingly depart from the vote. Recorded, with
   a reason, rather than silently overwritten. */
export async function recordVoteOverride(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return;

  await db
    .update(meals)
    .set({
      overridesVote: Boolean(reason),
      overrideReason: reason || null,
      updatedAt: new Date(),
    })
    .where(eq(meals.id, id));

  touch();
}

/* ---- dishes ------------------------------------------------------------- */

export async function addDish(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();

  /* A dish belongs to a meal that is being cooked, or to an evening the camp
     is still voting on — never both, which the database enforces. The form
     says which by sending one field or the other. */
  const mealId = String(formData.get("mealId") ?? "") || null;
  const voteOptionId = String(formData.get("voteOptionId") ?? "") || null;

  if (!mealId && !voteOptionId) return { error: "לא ברור לאיזו ארוחה" };
  if (mealId && voteOptionId) return { error: "מנה שייכת לארוחה אחת בלבד" };
  if (!name) return { error: "צריך שם למנה" };

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(dishes)
    .where(mealId ? eq(dishes.mealId, mealId) : eq(dishes.voteOptionId, voteOptionId!));

  await db.insert(dishes).values({
    id: newId(),
    mealId,
    voteOptionId,
    name,
    role: String(formData.get("role") ?? "main") as "main",
    dietary: String(formData.get("dietary") ?? "omnivore") as "omnivore",
    sortOrder: count,
  });

  touch();
  if (voteOptionId) revalidatePath("/hq/votes", "layout");
  return { ok: true };
}

export async function updateDish(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const allergensRaw = formData.getAll("allergens").map(String).filter(Boolean);

  await db
    .update(dishes)
    .set({
      name: String(formData.get("name") ?? "").trim() || "מנה",
      role: String(formData.get("role") ?? "main") as "main",
      dietary: String(formData.get("dietary") ?? "omnivore") as "omnivore",
      allergens: allergensRaw,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .where(eq(dishes.id, id));

  touch();
  revalidatePath("/hq/votes", "layout");
}

export async function deleteDish(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(dishes).where(eq(dishes.id, id));
  touch();
  revalidatePath("/hq/votes", "layout");
}
