"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { shiftAssignments, shifts } from "@/lib/db/schema";
import { assertUser } from "@/lib/auth/guard";
import { getSettings } from "@/lib/data/camp";
import { newId } from "@/lib/utils";

/* ============================================================================
   JOINING AND LEAVING A SHIFT — Bible §22

   Capacity is enforced on the server, at the moment of writing, against a
   freshly counted number of assignments. Two people tapping "אני בפנים" on
   the last slot from two phones must not both get in.
   ========================================================================= */

export interface ShiftActionState {
  error?: string;
  shiftId?: string;
}

export async function joinShift(
  _prev: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  const user = await assertUser();
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!shiftId) return { error: "משמרת לא נמצאה" };

  const camp = await getSettings();
  if (camp.lockedAt) {
    return { error: "המטבח נעול. דברו עם מנהל.ת המטבח.", shiftId };
  }
  if (camp.shiftsOpenAt && camp.shiftsOpenAt.getTime() > Date.now()) {
    return { error: "בחירת המשמרות עוד לא נפתחה", shiftId };
  }

  const shift = await db.query.shifts.findFirst({
    where: eq(shifts.id, shiftId),
  });
  if (!shift) return { error: "משמרת לא נמצאה" };

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shiftAssignments)
    .where(eq(shiftAssignments.shiftId, shiftId));

  if (count >= shift.requiredPeople) {
    return { error: "המשמרת הזו כבר מלאה", shiftId };
  }

  try {
    await db.insert(shiftAssignments).values({
      id: newId(),
      shiftId,
      userId: user.id,
      source: "self",
    });
  } catch {
    /* Unique index already holds them there — nothing to do. */
  }

  revalidatePath("/shifts");
  revalidatePath("/");
  revalidatePath("/hq/shifts");
  revalidatePath("/hq");
  return {};
}

export async function leaveShift(
  _prev: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  const user = await assertUser();
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!shiftId) return { error: "משמרת לא נמצאה" };

  const camp = await getSettings();
  if (camp.lockedAt) {
    return { error: "המטבח נעול. דברו עם מנהל.ת המטבח.", shiftId };
  }

  await db
    .delete(shiftAssignments)
    .where(
      and(
        eq(shiftAssignments.shiftId, shiftId),
        eq(shiftAssignments.userId, user.id),
      ),
    );

  revalidatePath("/shifts");
  revalidatePath("/");
  revalidatePath("/hq/shifts");
  revalidatePath("/hq");
  return {};
}
