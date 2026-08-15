/* ============================================================================
   UNITS & PRACTICAL KITCHEN ROUNDING
   Bible §19: "real kitchens do not operate on mathematically perfect values…
   15.33 onions is less useful than 16 onions."
   Bible §20: quantities may use units, grams, kilograms, millilitres, litres,
   packages, bottles, cans, and other practical purchasing units.
   ========================================================================= */

export type Dimension = "mass" | "volume" | "count";

export interface UnitDef {
  key: string;
  he: string;
  dimension: Dimension;
  /* How many base units (g / ml / items) one of these is worth. */
  toBase: number;
  /* Can this unit be split, or must you buy whole ones? */
  discrete: boolean;
}

export const UNITS: UnitDef[] = [
  { key: "g", he: "גרם", dimension: "mass", toBase: 1, discrete: false },
  { key: "kg", he: 'ק"ג', dimension: "mass", toBase: 1000, discrete: false },
  { key: "ml", he: 'מ"ל', dimension: "volume", toBase: 1, discrete: false },
  { key: "l", he: "ליטר", dimension: "volume", toBase: 1000, discrete: false },
  { key: "unit", he: "יח׳", dimension: "count", toBase: 1, discrete: true },
  { key: "package", he: "חבילה", dimension: "count", toBase: 1, discrete: true },
  { key: "bottle", he: "בקבוק", dimension: "count", toBase: 1, discrete: true },
  { key: "can", he: "קופסה", dimension: "count", toBase: 1, discrete: true },
  { key: "bunch", he: "צרור", dimension: "count", toBase: 1, discrete: true },
  { key: "tray", he: "מגש", dimension: "count", toBase: 1, discrete: true },
  { key: "tbsp", he: "כף", dimension: "volume", toBase: 15, discrete: false },
  { key: "tsp", he: "כפית", dimension: "volume", toBase: 5, discrete: false },
  { key: "cup", he: "כוס", dimension: "volume", toBase: 240, discrete: false },
];

export const UNIT_MAP = new Map(UNITS.map((u) => [u.key, u]));

export function unitLabel(key: string): string {
  return UNIT_MAP.get(key)?.he ?? key;
}

export function unitDimension(key: string): Dimension | null {
  return UNIT_MAP.get(key)?.dimension ?? null;
}

/* Two quantities can only be added when they share a dimension AND, for counts,
   the exact unit — three "packages" plus two "bottles" is not five of anything. */
export function isCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const ua = UNIT_MAP.get(a);
  const ub = UNIT_MAP.get(b);
  if (!ua || !ub) return false;
  if (ua.dimension !== ub.dimension) return false;
  return ua.dimension !== "count";
}

export function toBase(quantity: number, unit: string): number {
  return quantity * (UNIT_MAP.get(unit)?.toBase ?? 1);
}

export function fromBase(base: number, unit: string): number {
  return base / (UNIT_MAP.get(unit)?.toBase ?? 1);
}

/* Pick the unit a human would actually say out loud.
   1400 g → 1.4 kg. 300 g stays 300 g. 2500 ml → 2.5 l. */
export function bestUnit(base: number, dimension: Dimension): string {
  if (dimension === "mass") return base >= 1000 ? "kg" : "g";
  if (dimension === "volume") return base >= 1000 ? "l" : "ml";
  return "unit";
}

/* ---------------------------------------------------------------------------
   PRACTICAL ROUNDING
   The single most product-defining function in this file. It is the difference
   between a spreadsheet and a kitchen.

   Rounding is always UP for discrete things — running out of onions in the
   desert is a real failure; one spare onion is not.
   ------------------------------------------------------------------------ */
export function practicalRound(quantity: number, unit: string): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const def = UNIT_MAP.get(unit);

  if (!def || def.discrete) {
    return Math.ceil(quantity);
  }

  switch (unit) {
    case "kg":
      if (quantity < 1) return Math.ceil(quantity * 10) / 10; // 0.1 kg steps
      if (quantity < 10) return Math.ceil(quantity * 4) / 4; // 250 g steps
      return Math.ceil(quantity * 2) / 2; // 500 g steps
    case "g":
      if (quantity < 100) return Math.ceil(quantity / 5) * 5;
      if (quantity < 1000) return Math.ceil(quantity / 25) * 25;
      return Math.ceil(quantity / 100) * 100;
    case "l":
      if (quantity < 1) return Math.ceil(quantity * 4) / 4;
      return Math.ceil(quantity * 2) / 2;
    case "ml":
      if (quantity < 100) return Math.ceil(quantity / 5) * 5;
      return Math.ceil(quantity / 50) * 50;
    case "cup":
      return Math.ceil(quantity * 4) / 4;
    case "tbsp":
    case "tsp":
      return Math.ceil(quantity * 2) / 2;
    default:
      return Math.round(quantity * 100) / 100;
  }
}

/* Display without trailing zero noise: 16 not 16.00, 1.5 not 1.50. */
export function formatQuantity(quantity: number): string {
  if (!Number.isFinite(quantity)) return "—";
  const rounded = Math.round(quantity * 1000) / 1000;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

export function formatAmount(quantity: number, unit: string): string {
  return `${formatQuantity(quantity)} ${unitLabel(unit)}`;
}

/* Sum a list of quantities that may be expressed in different units.
   Returns null when they genuinely cannot be combined, so the caller can show
   them separately rather than inventing a wrong total. */
export function sumQuantities(
  entries: { quantity: number; unit: string }[],
): { quantity: number; unit: string } | null {
  if (entries.length === 0) return null;
  const first = UNIT_MAP.get(entries[0].unit);
  if (!first) return null;

  if (first.dimension === "count") {
    if (!entries.every((e) => e.unit === entries[0].unit)) return null;
    return {
      quantity: entries.reduce((s, e) => s + e.quantity, 0),
      unit: entries[0].unit,
    };
  }

  if (!entries.every((e) => UNIT_MAP.get(e.unit)?.dimension === first.dimension)) {
    return null;
  }

  const base = entries.reduce((s, e) => s + toBase(e.quantity, e.unit), 0);
  const unit = bestUnit(base, first.dimension);
  return { quantity: fromBase(base, unit), unit };
}
