"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";
import { getReadiness } from "@/lib/data/readiness";

export interface LockState {
  error?: string;
  /* Bible §32: "The system should not encourage locking while critical
     preparation remains unresolved." Two steps, and the first one names the
     blockers out loud. */
  needsConfirm?: boolean;
  blockers?: string[];
  ok?: boolean;
}

export async function lockKitchen(
  _prev: LockState,
  formData: FormData,
): Promise<LockState> {
  const admin = await assertAdmin();
  const confirmed = String(formData.get("confirmed") ?? "") === "1";

  const readiness = await getReadiness();

  if (!confirmed) {
    return {
      needsConfirm: true,
      blockers: readiness.blockers.map((b) => b.detail),
    };
  }

  await db
    .update(settings)
    .set({
      lockedAt: new Date(),
      lockedBy: admin.name,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, "camp"));

  revalidatePath("/", "layout");
  return { ok: true };
}

/* Bible §32: "The Kitchen Lead may still need an emergency ability to unlock
   or amend something, but this should be deliberate rather than casual." */
export async function unlockKitchen(
  _prev: LockState,
  formData: FormData,
): Promise<LockState> {
  await assertAdmin();
  const phrase = String(formData.get("phrase") ?? "").trim();

  if (phrase !== "לפתוח את המטבח") {
    return { error: "כדי לפתוח את המטבח, הקלידו בדיוק: לפתוח את המטבח" };
  }

  await db
    .update(settings)
    .set({ lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(eq(settings.id, "camp"));

  revalidatePath("/", "layout");
  return { ok: true };
}
