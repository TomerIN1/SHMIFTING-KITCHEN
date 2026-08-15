import {
  isCompatible,
  toBase,
  fromBase,
  bestUnit,
  unitDimension,
  practicalRound,
  type Dimension,
} from "./units";

/* ============================================================================
   MASTER SHOPPING LIST — Bible §26
   "If three recipes require tomatoes, the Kitchen Lead should not manually
   combine them. The system should aggregate them."

   Aggregation happens on every read rather than being written into a table.
   That is deliberate: a stored shopping quantity silently rots the moment a
   recipe or a diner count changes, and a wrong shopping list in the desert is
   not recoverable. What IS stored is only what a human decided — the
   override, the assignee, the status, the actual cost.
   ========================================================================= */

export interface ShoppingSource {
  mealId: string;
  mealTitle: string;
  mealDate: Date;
  dishName: string;
  recipeName: string;
  quantity: number;
  unit: string;
  servings: number;
}

export interface AggregatedIngredient {
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  /* Straight sum of every recipe line, converted to a common unit. */
  rawQuantity: number;
  /* The same number rounded to something a shop actually sells. */
  derivedQuantity: number;
  /* Lines that could not be added to the main total (incompatible units). */
  extras: { quantity: number; unit: string }[];
  sources: ShoppingSource[];
  estimatedUnitCost: number;
  allergens: string[];
}

export interface RecipeLineForShopping {
  mealId: string;
  mealTitle: string;
  mealDate: Date;
  mealStatus: string;
  dishName: string;
  recipeName: string;
  baseServings: number;
  targetServings: number;
  ingredientId: string;
  ingredientName: string;
  category: string;
  /* The unit `estimatedUnitCost` is quoted in. Aggregation may land on a
     different unit in the same dimension (500 g rather than 0.5 kg), so the
     price has to travel with the unit it belongs to. */
  defaultUnit: string;
  estimatedUnitCost: number;
  allergens: string[];
  quantity: number;
  unit: string;
  scaledOverride: number | null;
}

/* Restate a price quoted per `fromUnit` as a price per `toUnit`.
   22 ₪/kg becomes 0.022 ₪/g. Units that cannot be converted (three "packages"
   vs two "bottles") keep the original figure — the Kitchen Lead overrides it,
   which is exactly the human authority Bible §23 reserves for them. */
export function convertUnitCost(
  cost: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (fromUnit === toUnit) return cost;
  const from = unitDimension(fromUnit);
  const to = unitDimension(toUnit);
  if (!from || !to || from !== to || from === "count") return cost;
  return cost * (toBase(1, toUnit) / toBase(1, fromUnit));
}

/* Turn every recipe line in the menu into one row per ingredient. */
export function aggregateIngredients(
  lines: RecipeLineForShopping[],
): AggregatedIngredient[] {
  const byIngredient = new Map<string, RecipeLineForShopping[]>();

  for (const line of lines) {
    const list = byIngredient.get(line.ingredientId) ?? [];
    list.push(line);
    byIngredient.set(line.ingredientId, list);
  }

  const result: AggregatedIngredient[] = [];

  for (const [ingredientId, group] of byIngredient) {
    const scaled = group.map((line) => {
      const factor =
        line.baseServings > 0 ? line.targetServings / line.baseServings : 1;
      const quantity =
        line.scaledOverride !== null && line.scaledOverride !== undefined
          ? line.scaledOverride
          : line.quantity * factor;
      return { line, quantity, unit: line.unit };
    });

    /* Choose the dimension carried by most lines; anything that cannot be
       converted into it is listed separately rather than silently dropped. */
    const dimCount = new Map<Dimension, number>();
    for (const s of scaled) {
      const dim = unitDimension(s.unit);
      if (dim) dimCount.set(dim, (dimCount.get(dim) ?? 0) + 1);
    }
    const mainDim =
      [...dimCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "count";

    const primary = scaled.filter((s) => unitDimension(s.unit) === mainDim);
    const leftovers = scaled.filter((s) => unitDimension(s.unit) !== mainDim);

    let unit: string;
    let rawQuantity: number;

    if (mainDim === "count") {
      /* Counts only combine when the unit matches exactly — three packages
         plus two bottles is not five of anything. */
      const unitCounts = new Map<string, number>();
      for (const s of primary) {
        unitCounts.set(s.unit, (unitCounts.get(s.unit) ?? 0) + s.quantity);
      }
      const sorted = [...unitCounts.entries()].sort((a, b) => b[1] - a[1]);
      unit = sorted[0]?.[0] ?? group[0].unit;
      rawQuantity = sorted[0]?.[1] ?? 0;
      for (const [u, q] of sorted.slice(1)) leftovers.push({ line: group[0], quantity: q, unit: u });
    } else {
      const base = primary.reduce((s, x) => s + toBase(x.quantity, x.unit), 0);
      unit = bestUnit(base, mainDim);
      rawQuantity = fromBase(base, unit);
    }

    const first = group[0];
    result.push({
      ingredientId,
      name: first.ingredientName,
      category: first.category,
      unit,
      rawQuantity,
      derivedQuantity: practicalRound(rawQuantity, unit),
      extras: mergeExtras(leftovers.map((l) => ({ quantity: l.quantity, unit: l.unit }))),
      sources: scaled.map((s) => ({
        mealId: s.line.mealId,
        mealTitle: s.line.mealTitle,
        mealDate: s.line.mealDate,
        dishName: s.line.dishName,
        recipeName: s.line.recipeName,
        quantity: s.quantity,
        unit: s.unit,
        servings: s.line.targetServings,
      })),
      estimatedUnitCost: convertUnitCost(
        first.estimatedUnitCost,
        first.defaultUnit,
        unit,
      ),
      allergens: first.allergens,
    });
  }

  return result;
}

function mergeExtras(
  extras: { quantity: number; unit: string }[],
): { quantity: number; unit: string }[] {
  const byUnit = new Map<string, number>();
  for (const e of extras) {
    byUnit.set(e.unit, (byUnit.get(e.unit) ?? 0) + e.quantity);
  }
  return [...byUnit.entries()].map(([unit, quantity]) => ({
    quantity: practicalRound(quantity, unit),
    unit,
  }));
}

/* --- Merging the derived list with what humans decided ------------------ */

export interface ShoppingRowInput {
  id: string;
  ingredientId: string | null;
  name: string;
  category: string;
  unit: string;
  manualQuantity: number | null;
  quantityOverride: number | null;
  estimatedUnitCost: number | null;
  actualCost: number | null;
  status: "needed" | "assigned" | "bought";
  assigneeId: string | null;
  assigneeName?: string | null;
  notes: string | null;
  isManual: boolean;
}

export interface ShoppingRow {
  id: string | null;
  ingredientId: string | null;
  name: string;
  category: string;
  unit: string;
  derivedQuantity: number;
  finalQuantity: number;
  isOverridden: boolean;
  extras: { quantity: number; unit: string }[];
  status: "needed" | "assigned" | "bought";
  assigneeId: string | null;
  assigneeName: string | null;
  estimatedCost: number;
  actualCost: number | null;
  notes: string | null;
  isManual: boolean;
  sources: ShoppingSource[];
  allergens: string[];
}

export function buildShoppingList(
  aggregated: AggregatedIngredient[],
  rows: ShoppingRowInput[],
): ShoppingRow[] {
  const rowByIngredient = new Map(
    rows.filter((r) => r.ingredientId).map((r) => [r.ingredientId!, r]),
  );

  const fromRecipes: ShoppingRow[] = aggregated.map((agg) => {
    const row = rowByIngredient.get(agg.ingredientId);
    const isOverridden =
      row?.quantityOverride !== null && row?.quantityOverride !== undefined;
    const finalQuantity = isOverridden
      ? (row!.quantityOverride as number)
      : agg.derivedQuantity;
    const unitCost = row?.estimatedUnitCost ?? agg.estimatedUnitCost;

    return {
      id: row?.id ?? null,
      ingredientId: agg.ingredientId,
      name: agg.name,
      category: agg.category,
      unit: agg.unit,
      derivedQuantity: agg.derivedQuantity,
      finalQuantity,
      isOverridden,
      extras: agg.extras,
      status: row?.status ?? "needed",
      assigneeId: row?.assigneeId ?? null,
      assigneeName: row?.assigneeName ?? null,
      estimatedCost: finalQuantity * unitCost,
      actualCost: row?.actualCost ?? null,
      notes: row?.notes ?? null,
      isManual: false,
      sources: agg.sources,
      allergens: agg.allergens,
    };
  });

  /* Bible §29 — paper towels, bin bags, foil. Never recipe-derived. */
  const manual: ShoppingRow[] = rows
    .filter((r) => r.isManual)
    .map((r) => {
      const quantity = r.quantityOverride ?? r.manualQuantity ?? 0;
      return {
        id: r.id,
        ingredientId: r.ingredientId,
        name: r.name,
        category: r.category,
        unit: r.unit,
        derivedQuantity: quantity,
        finalQuantity: quantity,
        isOverridden: false,
        extras: [],
        status: r.status,
        assigneeId: r.assigneeId,
        assigneeName: r.assigneeName ?? null,
        estimatedCost: quantity * (r.estimatedUnitCost ?? 0),
        actualCost: r.actualCost,
        notes: r.notes,
        isManual: true,
        sources: [],
        allergens: [],
      };
    });

  return [...fromRecipes, ...manual];
}

export interface ShoppingSummary {
  total: number;
  needed: number;
  assigned: number;
  bought: number;
  unassigned: number;
  estimatedTotal: number;
  actualTotal: number;
  pctBought: number;
}

export function summariseShopping(rows: ShoppingRow[]): ShoppingSummary {
  const bought = rows.filter((r) => r.status === "bought");
  return {
    total: rows.length,
    needed: rows.filter((r) => r.status === "needed").length,
    assigned: rows.filter((r) => r.status === "assigned").length,
    bought: bought.length,
    unassigned: rows.filter((r) => r.status !== "bought" && !r.assigneeId).length,
    estimatedTotal: rows.reduce((s, r) => s + r.estimatedCost, 0),
    /* Bought items report what they really cost; everything else still
       contributes its estimate, so the running total is always a full
       projection rather than a partial receipt. */
    actualTotal: rows.reduce(
      (s, r) => s + (r.status === "bought" ? (r.actualCost ?? r.estimatedCost) : r.estimatedCost),
      0,
    ),
    pctBought: rows.length ? Math.round((bought.length / rows.length) * 100) : 0,
  };
}

/* Kept for callers that need the compatibility test directly. */
export { isCompatible };
