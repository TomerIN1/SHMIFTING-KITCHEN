import "server-only";
import { cache } from "react";
import { asc, eq, isNull } from "drizzle-orm";
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

/* The camp, shaped for every dietary calculation in the product.

   Only people who are actually coming. This one filter is what makes
   "not coming" mean something: it removes them from dietary coverage, the
   allergy centre, the breakdown, the shift quota and readiness in a single
   place, rather than each screen having to remember. */
export const getDiners = cache(async (): Promise<DinerInput[]> => {
  const rows = await db.query.users.findMany({
    where: isNull(users.notComingAt),
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

/** Everyone on record, including people who dropped out. Use this only where
    the Kitchen Lead is managing the roster itself. */
export const getPeople = cache(async () => {
  return db.query.users.findMany({
    with: { profile: true, allergies: true },
    orderBy: [asc(users.name)],
  });
});

/** Everyone still coming. This is what belongs in a person-picker: assigning
    a shift or a shopping run to somebody who is not turning up is worse than
    leaving it unassigned, because it looks handled. */
export const getActivePeople = cache(async () => {
  return db.query.users.findMany({
    where: isNull(users.notComingAt),
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

/** How many people a meal should be cooked for, when the meal doesn't say.
 *
 *  Derived from the roster by default: whoever has joined and has not dropped
 *  out is who we are cooking for. Two people registered means we cook for two.
 *  Nobody should have to keep a head count in sync by hand when the product
 *  already knows it (Bible §22), and a stale number here silently multiplies
 *  every recipe quantity, every shopping line and the whole budget.
 *
 *  `settings.expectedDiners` overrides it when set, because the Lead
 *  legitimately knows things the roster does not — six friends arriving who
 *  never signed up (Bible §23).
 */
export const defaultDiners = cache(async (): Promise<number> => {
  const camp = await getSettings();
  if (camp.expectedDiners !== null) return camp.expectedDiners;
  return (await getDiners()).length;
});
