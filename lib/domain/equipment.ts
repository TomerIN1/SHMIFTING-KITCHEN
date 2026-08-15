/* ============================================================================
   KITCHEN EQUIPMENT — the vocabulary

   Pure functions and labels, no database. Same shape as categories.ts so the
   two read alike.
   ========================================================================= */

export const EQUIPMENT_CATEGORIES = [
  { key: "cold", he: "קירור", accent: "dust-blue" },
  { key: "heat", he: "בישול ואש", accent: "terracotta" },
  { key: "prep", he: "הכנה וחיתוך", accent: "sun" },
  { key: "serve", he: "הגשה", accent: "shmift-pink" },
  { key: "wash", he: "שטיפה וניקיון", accent: "good" },
  { key: "structure", he: "שולחנות ומבנה", accent: "lavender" },
  { key: "other", he: "שונות", accent: "cream" },
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]["key"];

const CATEGORY_MAP = new Map(EQUIPMENT_CATEGORIES.map((c) => [c.key, c]));

export function equipmentCategoryLabel(key: string): string {
  return CATEGORY_MAP.get(key as EquipmentCategory)?.he ?? key;
}

export function equipmentCategoryAccent(key: string): string {
  return CATEGORY_MAP.get(key as EquipmentCategory)?.accent ?? "cream";
}

/* How a thing arrives. `borrow` and `have` are deliberately separate from a
   zero price on `buy`: "somebody is bringing it" is a commitment that can
   fall through, and "we already own it" cannot. The Lead needs to see the
   difference at a glance in the week before departure. */
export const ACQUISITION = {
  rent: { he: "השכרה", costs: true },
  buy: { he: "קנייה", costs: true },
  borrow: { he: "שאילה", costs: false },
  have: { he: "כבר יש לנו", costs: false },
} as const;

export type Acquisition = keyof typeof ACQUISITION;

export function acquisitionLabel(key: string): string {
  return ACQUISITION[key as Acquisition]?.he ?? key;
}

export function acquisitionCosts(key: string): boolean {
  return ACQUISITION[key as Acquisition]?.costs ?? true;
}

export const EQUIPMENT_STATUS = {
  needed: { he: "צריך למצוא", tone: "alarm" },
  sourced: { he: "מצאנו מאיפה", tone: "attention" },
  secured: { he: "סגור", tone: "good" },
} as const;

export type EquipmentStatus = keyof typeof EQUIPMENT_STATUS;

export function equipmentStatusLabel(key: string): string {
  return EQUIPMENT_STATUS[key as EquipmentStatus]?.he ?? key;
}

export function equipmentStatusTone(key: string): string {
  return EQUIPMENT_STATUS[key as EquipmentStatus]?.tone ?? "cream";
}

export interface EquipmentLine {
  quantity: number;
  estimatedCost: number;
  actualCost: number | null;
  acquisition: string;
  status: string;
}

/** What one line costs: nothing when borrowed or already owned. */
export function lineCost(item: EquipmentLine): number {
  if (!acquisitionCosts(item.acquisition)) return 0;
  return (item.actualCost ?? item.estimatedCost) * item.quantity;
}

export interface EquipmentSummary {
  projected: number;
  /* Only what has actually been paid, so the budget can separate committed
     from spent the same way the shopping list does. */
  spent: number;
  items: number;
  /* Still to find. This is the number that should worry somebody in October. */
  outstanding: number;
  free: number;
}

export function summariseEquipment(items: EquipmentLine[]): EquipmentSummary {
  let projected = 0;
  let spent = 0;
  let outstanding = 0;
  let free = 0;

  for (const item of items) {
    const cost = lineCost(item);
    projected += cost;
    if (item.actualCost !== null) spent += item.actualCost * item.quantity;
    if (item.status === "needed") outstanding++;
    if (!acquisitionCosts(item.acquisition)) free++;
  }

  return { projected, spent, items: items.length, outstanding, free };
}
