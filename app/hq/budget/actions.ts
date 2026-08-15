"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";

export interface BudgetState {
  error?: string;
  ok?: boolean;
}

function touch() {
  revalidatePath("/hq/budget");
  revalidatePath("/hq/readiness");
  revalidatePath("/hq");
}

export async function updateBudget(
  _prev: BudgetState,
  formData: FormData,
): Promise<BudgetState> {
  await assertAdmin();

  const perPerson = Number(formData.get("budgetPerPerson") ?? 0);
  /* Blank means "no pot given" and falls back to the per-person rate. */
  const totalRaw = String(formData.get("budgetTotal") ?? "").trim();
  const budgetTotal = totalRaw === "" ? null : Number(totalRaw);
  if (budgetTotal !== null && (!Number.isFinite(budgetTotal) || budgetTotal < 0)) {
    return { error: "תקציב כולל לא תקין" };
  }
  /* Blank = derive from the roster. */
  const dinersRaw = String(formData.get("expectedDiners") ?? "").trim();
  const diners = dinersRaw === "" ? null : Number(dinersRaw);

  if (!Number.isFinite(perPerson) || perPerson < 0) {
    return { error: "תקציב לאדם לא תקין" };
  }
  if (diners !== null && (!Number.isFinite(diners) || diners < 1)) {
    return { error: "צריך לפחות סועד אחד, או להשאיר ריק לפי הנרשמים" };
  }

  await db
    .update(settings)
    .set({
      budgetPerPerson: perPerson,
      budgetTotal,
      expectedDiners: diners === null ? null : Math.round(diners),
      currency: String(formData.get("currency") ?? "₪").slice(0, 3),
      updatedAt: new Date(),
    })
    .where(eq(settings.id, "camp"));

  /* Changing the diner count rescales every recipe, so everything downstream
     has to be refreshed too. */
  revalidatePath("/hq", "layout");
  revalidatePath("/", "layout");
  touch();
  return { ok: true };
}

/* Bible §31: "budget reviewed" is a deliberate human act, and one of the
   readiness checks. */
export async function toggleBudgetReview(formData: FormData): Promise<void> {
  await assertAdmin();
  const reviewed = String(formData.get("reviewed") ?? "") === "1";

  await db
    .update(settings)
    .set({ budgetReviewedAt: reviewed ? new Date() : null, updatedAt: new Date() })
    .where(eq(settings.id, "camp"));

  touch();
}
