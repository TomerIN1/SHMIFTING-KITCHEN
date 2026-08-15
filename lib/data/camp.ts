import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, users } from "@/lib/db/schema";
import type { DinerInput } from "@/lib/domain/coverage";
import { campBreakdown } from "@/lib/domain/coverage";

/* ============================================================================
   CAMP-LEVEL READS
   Everything is wrapped in React's `cache` so a single render can ask "who is
   coming and what do they eat?" from six different components and still hit
   the database once.
   ========================================================================= */

export const getSettings = cache(async () => {
  const row = await db.query.settings.findFirst();
  if (row) return row;

  /* First run: the camp exists the moment somebody opens the product.
     Dates are placeholders the Kitchen Lead corrects in HQ → Settings, which
     is exactly what Bible §38 asks for — configurable, not hard-coded. */
  const departure = new Date();
  departure.setMonth(departure.getMonth() + 3);
  const festivalStart = new Date(departure);
  festivalStart.setDate(festivalStart.getDate() + 1);
  const festivalEnd = new Date(festivalStart);
  festivalEnd.setDate(festivalEnd.getDate() + 5);

  const [created] = await db
    .insert(settings)
    .values({
      id: "camp",
      departureDate: departure,
      festivalStart,
      festivalEnd,
    })
    .returning();

  return created;
});

/* The camp, shaped for every dietary calculation in the product. */
export const getDiners = cache(async (): Promise<DinerInput[]> => {
  const rows = await db.query.users.findMany({
    with: { profile: true, allergies: true },
    orderBy: [asc(users.name)],
  });

  return rows.map((u) => ({
    userId: u.id,
    name: u.name,
    dietaryPattern: u.profile?.dietaryPattern ?? "omnivore",
    restrictions: u.profile?.restrictions ?? [],
    allergies: u.allergies.map((a) => ({
      allergen: a.allergen,
      label: a.label,
      severity: a.severity,
      reviewedAt: a.reviewedAt,
    })),
    profileComplete: Boolean(u.profile?.completedAt),
  }));
});

export const getBreakdown = cache(async () => campBreakdown(await getDiners()));

export const getPeople = cache(async () => {
  return db.query.users.findMany({
    with: { profile: true, allergies: true },
    orderBy: [asc(users.name)],
  });
});

export const getUserWithProfile = cache(async (userId: string) => {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { profile: true, allergies: true },
  });
});

/** How many people a meal should be cooked for, when the meal doesn't say. */
export async function defaultDiners(): Promise<number> {
  const camp = await getSettings();
  return camp.expectedDiners;
}
