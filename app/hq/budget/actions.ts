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
  const diners = Number(formData.get("expectedDiners") ?? 0);

  if (!Number.isFinite(perPerson) || perPerson < 0) {
    return { error: "תקציב לאדם לא תקין" };
  }
  if (!Number.isFinite(diners) || diners < 1) {
    return { error: "צריך לפחות סועד אחד" };
  }

  await db
    .update(settings)
    .set({
      budgetPerPerson: perPerson,
      expectedDiners: Math.round(diners),
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
