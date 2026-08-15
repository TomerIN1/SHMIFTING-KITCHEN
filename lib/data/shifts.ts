import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { shifts } from "@/lib/db/schema";
import { shiftTypeOrder } from "@/lib/domain/categories";
import { getSettings, getDiners } from "./camp";

/* ============================================================================
   SHIFTS — Bible §21–§23
   "The product should make understaffing impossible to overlook."

   Every read therefore returns the gap, not just the assignments. No caller
   has to subtract anything to discover there is a problem.
   ========================================================================= */

export const getShifts = cache(async () => {
  const rows = await db.query.shifts.findMany({
    orderBy: [asc(shifts.date)],
    with: {
      assignments: { with: { user: true } },
      meal: true,
    },
  });

  const sorted = [...rows].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    return shiftTypeOrder(a.mealType) - shiftTypeOrder(b.mealType);
  });

  return sorted.map((shift) => {
    const filled = shift.assignments.length;
    const missing = Math.max(0, shift.requiredPeople - filled);
    return {
      ...shift,
      filled,
      missing,
      isFull: missing === 0,
      isEmpty: filled === 0,
    };
  });
});

export type ShiftRow = Awaited<ReturnType<typeof getShifts>>[number];

export const getShiftStats = cache(async () => {
  const all = await getShifts();
  const diners = await getDiners();
  const camp = await getSettings();

  const assignedUserIds = new Set(
    all.flatMap((s) => s.assignments.map((a) => a.userId)),
  );

  /* "Not enough shifts" is measured against the camp's own rule, not a
     hard-coded number (Bible §38). */
  const shiftCounts = new Map<string, number>();
  for (const shift of all) {
    for (const a of shift.assignments) {
      shiftCounts.set(a.userId, (shiftCounts.get(a.userId) ?? 0) + 1);
    }
  }

  return {
    shiftsTotal: all.length,
    positionsRequired: all.reduce((s, x) => s + x.requiredPeople, 0),
    positionsFilled: all.reduce((s, x) => s + x.filled, 0),
    understaffed: all.filter((s) => s.missing > 0).length,
    empty: all.filter((s) => s.isEmpty).length,
    peopleWithoutShift: diners.filter((d) => !assignedUserIds.has(d.userId))
      .length,
    peopleBelowQuota: diners.filter(
      (d) => (shiftCounts.get(d.userId) ?? 0) < camp.shiftsPerPerson,
    ).length,
    quota: camp.shiftsPerPerson,
  };
});

export const getMyShifts = cache(async (userId: string) => {
  const all = await getShifts();
  return all.filter((s) => s.assignments.some((a) => a.userId === userId));
});
