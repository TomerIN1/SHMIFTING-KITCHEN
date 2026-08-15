"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { allergies } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";

/* ============================================================================
   ALLERGY REVIEW — Bible §11
   "Has the Kitchen Lead reviewed it?" is a first-class question, so reviewing
   is a first-class action with a timestamp, an author and a note — not a
   checkbox somebody can tick absentmindedly.
   ========================================================================= */

export interface ReviewState {
  error?: string;
}

export async function reviewAllergy(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!id) return { error: "לא נמצאה אלרגיה" };

  await db
    .update(allergies)
    .set({
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      reviewNote: note || null,
      updatedAt: new Date(),
    })
    .where(eq(allergies.id, id));

  revalidatePath("/hq/allergies");
  revalidatePath("/hq");
  revalidatePath("/hq/people");
  return {};
}

export async function unreviewAllergy(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "לא נמצאה אלרגיה" };

  await db
    .update(allergies)
    .set({
      reviewedAt: null,
      reviewedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(allergies.id, id));

  revalidatePath("/hq/allergies");
  revalidatePath("/hq");
  return {};
}
