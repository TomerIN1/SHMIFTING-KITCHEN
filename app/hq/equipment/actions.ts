"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { equipment } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";
import { newId } from "@/lib/utils";

export interface EquipmentState {
  ok?: boolean;
  error?: string;
}

function touch() {
  revalidatePath("/hq/equipment");
  revalidatePath("/hq/budget");
  revalidatePath("/hq");
}

/* A number field that a human left blank is not zero — it is unknown. But a
   cost of "unknown" cannot be added up, so blank estimates settle at 0 while
   `actualCost` keeps null meaning "nobody has paid yet". */
function num(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function nullableNum(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function addEquipment(
  _prev: EquipmentState,
  formData: FormData,
): Promise<EquipmentState> {
  await assertAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "צריך שם לפריט" };

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(equipment);

  await db.insert(equipment).values({
    id: newId(),
    name,
    category: String(formData.get("category") ?? "other"),
    acquisition: String(formData.get("acquisition") ?? "rent") as "rent",
    quantity: Math.max(1, Math.round(num(formData.get("quantity"), 1))),
    estimatedCost: num(formData.get("estimatedCost")),
    supplier: String(formData.get("supplier") ?? "").trim() || null,
    link: String(formData.get("link") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    sortOrder: count,
  });

  touch();
  return { ok: true };
}

export async function updateEquipment(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(equipment)
    .set({
      name: String(formData.get("name") ?? "").trim() || "פריט",
      category: String(formData.get("category") ?? "other"),
      acquisition: String(formData.get("acquisition") ?? "rent") as "rent",
      quantity: Math.max(1, Math.round(num(formData.get("quantity"), 1))),
      estimatedCost: num(formData.get("estimatedCost")),
      actualCost: nullableNum(formData.get("actualCost")),
      status: String(formData.get("status") ?? "needed") as "needed",
      supplier: String(formData.get("supplier") ?? "").trim() || null,
      link: String(formData.get("link") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(equipment.id, id));

  touch();
}

/** One click from "we need one" to "it is handled", without opening the form. */
export async function cycleStatus(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const current = String(formData.get("status") ?? "needed");
  if (!id) return;

  const next =
    current === "needed" ? "sourced" : current === "sourced" ? "secured" : "needed";

  await db
    .update(equipment)
    .set({ status: next as "needed", updatedAt: new Date() })
    .where(eq(equipment.id, id));

  touch();
}

export async function deleteEquipment(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(equipment).where(eq(equipment.id, id));
  touch();
}
