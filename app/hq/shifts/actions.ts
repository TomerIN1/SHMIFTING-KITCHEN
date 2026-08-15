"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { shifts, shiftAssignments } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";
import { newId } from "@/lib/utils";

export interface ShiftAdminState {
  error?: string;
  ok?: boolean;
}

function touch() {
  revalidatePath("/hq/shifts");
  revalidatePath("/hq/readiness");
  revalidatePath("/hq/pack");
  revalidatePath("/hq");
  revalidatePath("/shifts");
  revalidatePath("/");
}

export async function createShift(
  _prev: ShiftAdminState,
  formData: FormData,
): Promise<ShiftAdminState> {
  await assertAdmin();

  const dateRaw = String(formData.get("date") ?? "");
  const date = new Date(`${dateRaw}T12:00:00`);
  if (!dateRaw || Number.isNaN(date.getTime())) return { error: "תאריך לא תקין" };

  const required = Number(formData.get("requiredPeople") ?? 0);
  if (!Number.isFinite(required) || required < 1) {
    return { error: "צריך לפחות אדם אחד במשמרת" };
  }

  await db.insert(shifts).values({
    id: newId(),
    date,
    mealType: String(formData.get("mealType") ?? "dinner") as "dinner",
    startTime: String(formData.get("startTime") ?? "08:00"),
    endTime: String(formData.get("endTime") ?? "10:00"),
    requiredPeople: Math.round(required),
    label: String(formData.get("label") ?? "").trim() || null,
  });

  touch();
  return { ok: true };
}

export async function updateShift(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const required = Number(formData.get("requiredPeople") ?? 0);

  await db
    .update(shifts)
    .set({
      startTime: String(formData.get("startTime") ?? "08:00"),
      endTime: String(formData.get("endTime") ?? "10:00"),
      ...(Number.isFinite(required) && required >= 1
        ? { requiredPeople: Math.round(required) }
        : {}),
      label: String(formData.get("label") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .where(eq(shifts.id, id));

  touch();
}

export async function deleteShift(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(shifts).where(eq(shifts.id, id));
  touch();
}

/* Bible §22: "Kitchen Lead manual assignment, reassignment, removal."
   The Lead may deliberately exceed capacity — a real kitchen sometimes wants
   a fifth pair of hands — so this path warns rather than blocks. */
export async function assignToShift(
  _prev: ShiftAdminState,
  formData: FormData,
): Promise<ShiftAdminState> {
  await assertAdmin();
  const shiftId = String(formData.get("shiftId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!shiftId || !userId) return { error: "חסרים פרטים" };

  const existing = await db.query.shiftAssignments.findFirst({
    where: and(
      eq(shiftAssignments.shiftId, shiftId),
      eq(shiftAssignments.userId, userId),
    ),
  });
  if (existing) return { error: "הם כבר במשמרת הזו" };

  await db.insert(shiftAssignments).values({
    id: newId(),
    shiftId,
    userId,
    source: "lead",
  });

  touch();
  return { ok: true };
}

export async function removeAssignment(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id));
  touch();
}

/* Convenience for building a festival's worth of shifts at once — otherwise
   the Kitchen Lead types the same three rows five times. */
export async function generateShifts(
  _prev: ShiftAdminState,
  formData: FormData,
): Promise<ShiftAdminState> {
  await assertAdmin();

  const startRaw = String(formData.get("start") ?? "");
  const days = Number(formData.get("days") ?? 0);
  const start = new Date(`${startRaw}T12:00:00`);

  if (!startRaw || Number.isNaN(start.getTime())) return { error: "תאריך לא תקין" };
  if (!Number.isFinite(days) || days < 1 || days > 14) {
    return { error: "בין יום אחד ל-14" };
  }

  /* Which meals this camp actually cooks. Not every camp feeds three times a
     day — Shmifting leaves mornings and middays to people themselves and
     gathers everyone for dinner — and generating shifts nobody will ever fill
     makes the whole board read as understaffed forever (Bible §24). */
  const wanted = new Set(formData.getAll("meals").map(String));
  const crew = Number(formData.get("people") ?? 0);

  const template = (
    [
      { key: "breakfast", start: "08:00", end: "10:30", people: 4 },
      { key: "lunch", start: "12:30", end: "14:30", people: 3 },
      { key: "dinner", start: "16:30", end: "20:00", people: 5 },
    ] as const
  )
    .filter((slot) => wanted.has(slot.key))
    .map((slot) => ({
      ...slot,
      people: Number.isFinite(crew) && crew > 0 ? crew : slot.people,
    }));

  if (template.length === 0) {
    return { error: "צריך לבחור לפחות ארוחה אחת" };
  }

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shifts);
  if (count > 0) {
    return { error: "כבר יש משמרות. מחקו אותן קודם או הוסיפו ידנית." };
  }

  for (let day = 0; day < days; day++) {
    const date = new Date(start.getTime() + day * 86_400_000);
    for (const slot of template) {
      await db.insert(shifts).values({
        id: newId(),
        date,
        mealType: slot.key,
        startTime: slot.start,
        endTime: slot.end,
        requiredPeople: slot.people,
      });
    }
  }

  touch();
  return { ok: true };
}
