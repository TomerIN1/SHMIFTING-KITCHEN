import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { equipment } from "@/lib/db/schema";
import {
  summariseEquipment,
  lineCost,
  equipmentCategoryLabel,
  EQUIPMENT_CATEGORIES,
} from "@/lib/domain/equipment";

/* ============================================================================
   THE KIT

   Read-only side of the equipment list. Ordered by category the same way the
   shopping list is, because both end up as something somebody walks around
   with — one in a supermarket, one in a storage unit.
   ========================================================================= */

export const getEquipment = cache(async () => {
  const rows = await db.query.equipment.findMany({
    orderBy: [asc(equipment.sortOrder), asc(equipment.name)],
    with: { owner: { columns: { id: true, name: true } } },
  });

  return rows.map((row) => ({ ...row, cost: lineCost(row) }));
});

export type EquipmentRow = Awaited<ReturnType<typeof getEquipment>>[number];

export const getEquipmentSummary = cache(async () => {
  const rows = await getEquipment();
  return summariseEquipment(rows);
});

/** Grouped for the screen, in the fixed category order. */
export const getEquipmentByCategory = cache(async () => {
  const rows = await getEquipment();

  return EQUIPMENT_CATEGORIES.map((category) => ({
    key: category.key,
    label: equipmentCategoryLabel(category.key),
    accent: category.accent,
    items: rows.filter((r) => r.category === category.key),
  })).filter((group) => group.items.length > 0);
});
