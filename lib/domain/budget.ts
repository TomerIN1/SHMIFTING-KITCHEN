/* ============================================================================
   WHAT THE KITCHEN IS ALLOWED TO SPEND

   Two ways to say the same thing, and exactly one of them in force:

     budgetTotal      a pot. "The kitchen gets ₪8,000." This is how the
                      conversation with a camp's finance person actually goes,
                      so when it is set it wins and the per-head figure is
                      derived from it.
     budgetPerPerson  a rate. "₪45 a head." Used when nobody has given a pot
                      yet, or when the camp genuinely budgets that way.

   Deriving one from the other rather than storing both is the whole point. A
   camp that stores ₪8,000 AND ₪45 a head has two numbers that disagree the
   moment somebody new registers, and no way to know which one was meant.
   ========================================================================= */

export type BudgetSource = "total" | "perPerson" | "none";

export interface ResolvedBudget {
  /* Null when nobody has set anything. Every screen has to handle that: for
     most of the planning season it is the honest state, and a ceiling of ₪0
     would report a catastrophic overrun instead of "not decided yet". */
  total: number | null;
  perPerson: number | null;
  source: BudgetSource;
}

export function resolveBudget(input: {
  budgetTotal: number | null;
  budgetPerPerson: number;
  diners: number;
}): ResolvedBudget {
  const { budgetTotal, budgetPerPerson, diners } = input;

  if (budgetTotal !== null && budgetTotal > 0) {
    return {
      total: budgetTotal,
      perPerson: diners > 0 ? budgetTotal / diners : null,
      source: "total",
    };
  }

  if (budgetPerPerson > 0) {
    return {
      total: diners > 0 ? budgetPerPerson * diners : null,
      perPerson: budgetPerPerson,
      source: "perPerson",
    };
  }

  return { total: null, perPerson: null, source: "none" };
}

export interface BudgetStanding {
  food: number;
  equipment: number;
  projected: number;
  ceiling: number | null;
  remaining: number | null;
  /* Only ever true when a ceiling exists. "Over budget" with no budget is a
     statement about nothing. */
  overBudget: boolean;
  usedPct: number | null;
}

/** Food and equipment against the ceiling — the whole picture in one place. */
export function standing(input: {
  food: number;
  equipment: number;
  ceiling: number | null;
}): BudgetStanding {
  const projected = input.food + input.equipment;
  const ceiling = input.ceiling;

  return {
    food: input.food,
    equipment: input.equipment,
    projected,
    ceiling,
    remaining: ceiling === null ? null : ceiling - projected,
    overBudget: ceiling !== null && projected > ceiling,
    usedPct:
      ceiling === null || ceiling <= 0
        ? null
        : Math.round((projected / ceiling) * 100),
  };
}
