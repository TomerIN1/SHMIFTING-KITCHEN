"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";

/* Bible §16 — revealing the menu is its own moment, so it is its own action
   rather than a field buried in a settings form. */

export async function revealMenu(): Promise<void> {
  await assertAdmin();
  await db
    .update(settings)
    .set({ menuRevealedAt: new Date(), updatedAt: new Date() })
    .where(eq(settings.id, "camp"));

  revalidatePath("/hq/menu");
  revalidatePath("/menu");
  revalidatePath("/");
}

export async function hideMenu(): Promise<void> {
  await assertAdmin();
  await db
    .update(settings)
    .set({ menuRevealedAt: null, updatedAt: new Date() })
    .where(eq(settings.id, "camp"));

  revalidatePath("/hq/menu");
  revalidatePath("/menu");
  revalidatePath("/");
}
