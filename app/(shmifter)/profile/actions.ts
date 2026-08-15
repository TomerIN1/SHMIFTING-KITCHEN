"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { allergies, foodProfiles, users } from "@/lib/db/schema";
import { assertUser } from "@/lib/auth/guard";
import { newId } from "@/lib/utils";

/* ============================================================================
   SAVING A FOOD PROFILE

   Bible §11 shapes the whole shape of this action: allergies are written to
   their own table, never folded into the profile row, and a person can only
   ever write their OWN (Bible §34).

   Editing an allergy clears its review — if somebody changes "sesame, mild"
   to "sesame, anaphylaxis" after the Kitchen Lead signed it off, that
   signature is no longer true and must be earned again.
   ========================================================================= */

const allergySchema = z.object({
  id: z.string().optional(),
  allergen: z.string().min(1),
  label: z.string().trim().max(80).optional().nullable(),
  details: z.string().trim().max(600).optional().nullable(),
  severity: z.enum(["avoid", "severe", "anaphylaxis"]),
});

const profileSchema = z.object({
  name: z.string().trim().min(2, "צריך שם"),
  dietaryPattern: z.enum(["omnivore", "vegetarian", "vegan"]),
  spiceLevel: z.coerce.number().int().min(0).max(4),
  restrictions: z.array(z.string()).default([]),
  dislikes: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  wish: z.string().trim().max(500).optional().nullable(),
  allergies: z.array(allergySchema).max(15).default([]),
});

export interface ProfileState {
  ok?: boolean;
  error?: string;
  savedAt?: number;
}

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await assertUser();

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "משהו השתבש בשמירה. נסו שוב." };
  }

  const parsed = profileSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "יש שדה שלא תקין" };
  }

  const data = parsed.data;

  await db
    .update(users)
    .set({ name: data.name, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const existingProfile = await db.query.foodProfiles.findFirst({
    where: eq(foodProfiles.userId, user.id),
  });

  const profileValues = {
    dietaryPattern: data.dietaryPattern,
    spiceLevel: data.spiceLevel,
    restrictions: data.restrictions,
    dislikes: data.dislikes,
    wish: data.wish || null,
    /* Filling the form IS completing the profile. There is no separate
       "submit for real" step — Bible §6 asks that a Shmifter never feel like
       they are operating management software. */
    completedAt: existingProfile?.completedAt ?? new Date(),
    updatedAt: new Date(),
  };

  if (existingProfile) {
    await db
      .update(foodProfiles)
      .set(profileValues)
      .where(eq(foodProfiles.id, existingProfile.id));
  } else {
    await db
      .insert(foodProfiles)
      .values({ id: newId(), userId: user.id, ...profileValues });
  }

  /* --- allergies -------------------------------------------------------- */
  const existing = await db.query.allergies.findMany({
    where: eq(allergies.userId, user.id),
  });
  const keptIds = new Set(data.allergies.map((a) => a.id).filter(Boolean));

  for (const row of existing) {
    if (!keptIds.has(row.id)) {
      await db.delete(allergies).where(eq(allergies.id, row.id));
    }
  }

  for (const entry of data.allergies) {
    const previous = entry.id
      ? existing.find((e) => e.id === entry.id)
      : undefined;

    const changed =
      !previous ||
      previous.allergen !== entry.allergen ||
      previous.severity !== entry.severity ||
      (previous.details ?? "") !== (entry.details ?? "") ||
      (previous.label ?? "") !== (entry.label ?? "");

    const values = {
      allergen: entry.allergen,
      label: entry.label || null,
      details: entry.details || null,
      severity: entry.severity,
      updatedAt: new Date(),
      /* A changed allergy is an unreviewed allergy. */
      ...(changed
        ? { reviewedAt: null, reviewedBy: null, reviewNote: null }
        : {}),
    };

    if (previous) {
      await db.update(allergies).set(values).where(eq(allergies.id, previous.id));
    } else {
      await db
        .insert(allergies)
        .values({ id: newId(), userId: user.id, ...values });
    }
  }

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/hq", "layout");

  return { ok: true, savedAt: Date.now() };
}
