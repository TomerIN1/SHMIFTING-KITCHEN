import { canEat } from "./allergens";

/* ============================================================================
   DIETARY COVERAGE & ALLERGY CONFLICT DETECTION — Bible §11, §17, §40

   Bible §17 states the goal precisely:
     "The goal is not necessarily for every individual dish to serve every
      person. The goal is to ensure that every camp member has an appropriate,
      intentional meal available."

   So this module answers two different questions, and never confuses them:

     1. What does this DISH contain?      → a label. Informational.
     2. Can this PERSON eat this MEAL?    → a conflict. Operational.

   A dish containing sesame is not a problem.
   A person with a sesame allergy who has nothing to eat at dinner is.
   ========================================================================= */

export interface DinerInput {
  userId: string;
  name: string;
  dietaryPattern: string;
  restrictions: string[];
  allergies: {
    allergen: string;
    label?: string | null;
    severity: string;
    reviewedAt?: Date | null;
  }[];
  profileComplete: boolean;
}

export interface DishInput {
  id: string;
  name: string;
  role: string;
  dietary: string;
  /* Declared on the dish itself. */
  allergens: string[];
  /* Derived from the recipe's ingredients. */
  ingredientAllergens: string[];
  hasRecipe: boolean;
}

export type ConflictKind = "blocked" | "no_main";

export interface Conflict {
  kind: ConflictKind;
  userId: string;
  userName: string;
  /* Which of their allergens closed the door. Empty for pattern-only issues. */
  allergens: string[];
  worstSeverity: string;
  /* The dishes that carry their allergen — what the kitchen must handle. */
  offendingDishes: { id: string; name: string; allergens: string[] }[];
}

export interface MealCoverage {
  diners: number;
  byPattern: Record<
    string,
    { people: number; covered: number; ok: boolean }
  >;
  conflicts: Conflict[];
  blockedCount: number;
  noMainCount: number;
  /* Every allergen present anywhere in this meal — the kitchen labelling list. */
  allergensPresent: string[];
  dishesWithoutRecipe: number;
  ok: boolean;
}

/* All allergens a dish carries: declared + derived from its recipe. */
export function dishAllergens(dish: DishInput): string[] {
  return [...new Set([...dish.allergens, ...dish.ingredientAllergens])];
}

function safeForDiner(dish: DishInput, diner: DinerInput): boolean {
  if (!canEat(diner.dietaryPattern, dish.dietary)) return false;
  const carried = new Set(dishAllergens(dish));
  return !diner.allergies.some((a) => carried.has(a.allergen));
}

export function analyseMeal(
  dishes: DishInput[],
  diners: DinerInput[],
): MealCoverage {
  const patterns = ["omnivore", "vegetarian", "vegan"];
  const byPattern: MealCoverage["byPattern"] = {};

  for (const pattern of patterns) {
    const people = diners.filter((d) => d.dietaryPattern === pattern);
    /* Covered = this pattern has at least one dish it can eat, ignoring
       individual allergies (those are counted as conflicts below). */
    const hasDish = dishes.some((dish) => canEat(pattern, dish.dietary));
    byPattern[pattern] = {
      people: people.length,
      covered: hasDish ? people.length : 0,
      ok: people.length === 0 || hasDish,
    };
  }

  const conflicts: Conflict[] = [];

  /* A meal with no dishes is not "everybody is blocked" — it is "this meal has
     not been planned yet", which is a different problem, reported separately
     by the menu checks. Claiming 24 allergy conflicts for an empty meal would
     be exactly the warning fatigue Bible §40 tells us to avoid. */
  if (dishes.length === 0) {
    return {
      diners: diners.length,
      byPattern,
      conflicts: [],
      blockedCount: 0,
      noMainCount: 0,
      allergensPresent: [],
      dishesWithoutRecipe: 0,
      ok: false,
    };
  }

  for (const diner of diners) {
    const edible = dishes.filter((dish) => safeForDiner(dish, diner));
    const offending = dishes
      .filter((dish) => {
        const carried = new Set(dishAllergens(dish));
        return diner.allergies.some((a) => carried.has(a.allergen));
      })
      .map((dish) => ({
        id: dish.id,
        name: dish.name,
        allergens: dishAllergens(dish).filter((a) =>
          diner.allergies.some((x) => x.allergen === a),
        ),
      }));

    const relevantAllergens = [
      ...new Set(offending.flatMap((d) => d.allergens)),
    ];
    const worstSeverity = diner.allergies
      .filter((a) => relevantAllergens.includes(a.allergen))
      .map((a) => a.severity)
      .sort(
        (a, b) => severityWeight(b) - severityWeight(a),
      )[0] ?? "avoid";

    if (edible.length === 0) {
      conflicts.push({
        kind: "blocked",
        userId: diner.userId,
        userName: diner.name,
        allergens: relevantAllergens,
        worstSeverity,
        offendingDishes: offending,
      });
    } else if (!edible.some((d) => d.role === "main")) {
      /* They can eat *something*, but there is no main course for them.
         Not a safety failure — a hospitality failure. Different weight,
         still worth surfacing (Bible §24). */
      conflicts.push({
        kind: "no_main",
        userId: diner.userId,
        userName: diner.name,
        allergens: relevantAllergens,
        worstSeverity,
        offendingDishes: offending,
      });
    }
  }

  const allergensPresent = [
    ...new Set(dishes.flatMap((d) => dishAllergens(d))),
  ];

  return {
    diners: diners.length,
    byPattern,
    conflicts,
    blockedCount: conflicts.filter((c) => c.kind === "blocked").length,
    noMainCount: conflicts.filter((c) => c.kind === "no_main").length,
    allergensPresent,
    dishesWithoutRecipe: dishes.filter((d) => !d.hasRecipe).length,
    ok:
      conflicts.filter((c) => c.kind === "blocked").length === 0 &&
      patterns.every((p) => byPattern[p].ok),
  };
}

export function severityWeight(severity: string): number {
  return severity === "anaphylaxis" ? 3 : severity === "severe" ? 2 : 1;
}

/* --- Camp-wide dietary breakdown (Bible §30, §42) ----------------------- */

export interface CampBreakdown {
  total: number;
  profilesComplete: number;
  profilesMissing: number;
  patterns: { key: string; count: number; pct: number }[];
  restrictions: { key: string; count: number }[];
  allergyPeople: number;
  allergyCount: number;
  unreviewedAllergies: number;
  severeAllergies: number;
}

export function campBreakdown(diners: DinerInput[]): CampBreakdown {
  const total = diners.length;
  const complete = diners.filter((d) => d.profileComplete);

  const patternCounts = new Map<string, number>();
  for (const p of ["omnivore", "vegetarian", "vegan"]) patternCounts.set(p, 0);
  for (const d of complete) {
    patternCounts.set(
      d.dietaryPattern,
      (patternCounts.get(d.dietaryPattern) ?? 0) + 1,
    );
  }

  const restrictionCounts = new Map<string, number>();
  for (const d of diners) {
    for (const r of d.restrictions) {
      restrictionCounts.set(r, (restrictionCounts.get(r) ?? 0) + 1);
    }
  }

  const allAllergies = diners.flatMap((d) => d.allergies);

  return {
    total,
    profilesComplete: complete.length,
    profilesMissing: total - complete.length,
    patterns: [...patternCounts.entries()].map(([key, count]) => ({
      key,
      count,
      pct: complete.length ? Math.round((count / complete.length) * 100) : 0,
    })),
    restrictions: [...restrictionCounts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
    allergyPeople: diners.filter((d) => d.allergies.length > 0).length,
    allergyCount: allAllergies.length,
    unreviewedAllergies: allAllergies.filter((a) => !a.reviewedAt).length,
    severeAllergies: allAllergies.filter(
      (a) => a.severity === "severe" || a.severity === "anaphylaxis",
    ).length,
  };
}
