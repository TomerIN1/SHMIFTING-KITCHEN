import { practicalRound, formatAmount } from "./units";
import { convertUnitCost } from "./shopping";

/* ============================================================================
   RECIPE SCALING — Bible §19
   "The product should assist the Kitchen Lead rather than pretend mathematical
   scaling always represents the correct cooking decision."

   Three numbers are therefore kept distinct and all three stay visible:

     raw       — what the maths says            (15.33 onions)
     practical — what a kitchen would buy       (16 onions)
     final     — what the Lead decided          (whatever they typed)

   The Lead's number always wins. The other two remain on screen so they can
   see what they overrode and why.
   ========================================================================= */

export interface RecipeItemInput {
  id: string;
  ingredientId: string;
  ingredientName: string;
  category: string;
  quantity: number;
  unit: string;
  note?: string | null;
  scaledOverride?: number | null;
  /* Price is quoted per the ingredient's own default unit; a recipe line may
     be written in a different one (grams of a per-kilo ingredient). */
  defaultUnit?: string;
  estimatedUnitCost?: number;
  allergens?: string[];
}

export interface ScaledItem extends RecipeItemInput {
  raw: number;
  practical: number;
  final: number;
  isOverridden: boolean;
  display: string;
  lineCost: number;
}

export interface ScaledRecipe {
  factor: number;
  baseServings: number;
  targetServings: number;
  items: ScaledItem[];
  totalCost: number;
}

export function scaleRecipe(
  baseServings: number,
  targetServings: number,
  items: RecipeItemInput[],
): ScaledRecipe {
  const safeBase = baseServings > 0 ? baseServings : 1;
  const factor = targetServings / safeBase;

  const scaled = items.map((item): ScaledItem => {
    const raw = item.quantity * factor;
    const practical = practicalRound(raw, item.unit);
    const isOverridden =
      item.scaledOverride !== null && item.scaledOverride !== undefined;
    const final = isOverridden ? (item.scaledOverride as number) : practical;

    return {
      ...item,
      raw,
      practical,
      final,
      isOverridden,
      display: formatAmount(final, item.unit),
      lineCost:
        final *
        convertUnitCost(
          item.estimatedUnitCost ?? 0,
          item.defaultUnit ?? item.unit,
          item.unit,
        ),
    };
  });

  return {
    factor,
    baseServings: safeBase,
    targetServings,
    items: scaled,
    totalCost: scaled.reduce((s, i) => s + i.lineCost, 0),
  };
}

/* How far the practical number drifted from the maths. Surfaced in the UI so
   the Lead can see when rounding added a meaningful amount of food (and cost)
   rather than a rounding crumb. */
export function roundingDrift(item: ScaledItem): number {
  if (item.raw === 0) return 0;
  return (item.final - item.raw) / item.raw;
}
