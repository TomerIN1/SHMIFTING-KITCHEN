/* ============================================================================
   THE READINESS ENGINE — Bible §31
   "This is not a meaningless gamification percentage. It represents actual
    operational completeness."

   Every number here is a count of real, nameable work. There is no check
   whose answer is "vibes". A check either has a denominator you can point at
   ("4 of 46 profiles"), or it is a single deliberate human act
   ("the Lead reviewed the budget").

   `critical: true` marks work that must be finished before LOCK THE KITCHEN.
   Everything else can remain imperfect — a camp is allowed to leave with a
   slightly incomplete shopping list; it is not allowed to leave with an
   unreviewed anaphylaxis.
   ========================================================================= */

export type CheckStatus = "done" | "attention" | "blocked";

export interface ReadinessCheck {
  id: string;
  label: string;
  /* A human sentence, not a status word. "4 פרופילים חסרים" beats "80%". */
  detail: string;
  done: number;
  total: number;
  critical: boolean;
  href?: string;
  status: CheckStatus;
  score: number;
}

export interface ReadinessArea {
  key: string;
  label: string;
  weight: number;
  checks: ReadinessCheck[];
  score: number;
  status: CheckStatus;
}

export interface Readiness {
  areas: ReadinessArea[];
  score: number;
  blockers: ReadinessCheck[];
  attention: ReadinessCheck[];
  canLock: boolean;
  locked: boolean;
}

export interface ReadinessInput {
  people: {
    total: number;
    profilesComplete: number;
    allergiesTotal: number;
    allergiesReviewed: number;
  };
  menu: {
    mealsPlanned: number;
    mealsFinal: number;
    mealsWithDishes: number;
    blockedDiners: number;
    mealsReviewedForCoverage: number;
  };
  recipes: {
    dishesTotal: number;
    dishesWithRecipe: number;
    recipesTotal: number;
    recipesFinal: number;
  };
  shifts: {
    positionsRequired: number;
    positionsFilled: number;
    shiftsTotal: number;
    shiftsUnderstaffed: number;
    peopleWithoutShift: number;
  };
  shopping: {
    total: number;
    bought: number;
    unassigned: number;
  };
  budget: {
    reviewed: boolean;
    totalBudget: number;
    projected: number;
  };
  locked: boolean;
}

function makeCheck(
  c: Omit<ReadinessCheck, "status" | "score">,
): ReadinessCheck {
  const score = c.total === 0 ? 1 : Math.min(1, c.done / c.total);
  const status: CheckStatus =
    score >= 1 ? "done" : c.critical ? "blocked" : "attention";
  return { ...c, score, status };
}

function makeArea(
  key: string,
  label: string,
  weight: number,
  checks: ReadinessCheck[],
): ReadinessArea {
  const score =
    checks.length === 0
      ? 1
      : checks.reduce((s, c) => s + c.score, 0) / checks.length;
  const status: CheckStatus = checks.some((c) => c.status === "blocked")
    ? "blocked"
    : checks.some((c) => c.status === "attention")
      ? "attention"
      : "done";
  return { key, label, weight, checks, score, status };
}

export function computeReadiness(input: ReadinessInput): Readiness {
  const { people, menu, recipes, shifts, shopping, budget } = input;

  const areas: ReadinessArea[] = [
    makeArea("people", "אנשים", 20, [
      makeCheck({
        id: "profiles",
        label: "פרופילי אוכל",
        detail:
          people.total - people.profilesComplete === 0
            ? "כל הפרופילים מולאו"
            : `${people.total - people.profilesComplete} פרופילים עוד חסרים`,
        done: people.profilesComplete,
        total: people.total,
        critical: true,
        href: "/hq/people",
      }),
      makeCheck({
        id: "allergies-reviewed",
        label: "אלרגיות שנבדקו",
        detail:
          people.allergiesTotal === 0
            ? "לא דווחו אלרגיות"
            : people.allergiesTotal - people.allergiesReviewed === 0
              ? "כל האלרגיות נבדקו"
              : `${people.allergiesTotal - people.allergiesReviewed} אלרגיות מחכות לבדיקה`,
        done: people.allergiesReviewed,
        total: people.allergiesTotal,
        critical: true,
        href: "/hq/allergies",
      }),
    ]),

    makeArea("menu", "תפריט", 20, [
      makeCheck({
        id: "meals-final",
        label: "ארוחות סופיות",
        detail:
          menu.mealsPlanned === 0
            ? "עוד לא תוכננו ארוחות"
            : `${menu.mealsFinal} מתוך ${menu.mealsPlanned} ארוחות סגורות`,
        done: menu.mealsFinal,
        total: Math.max(menu.mealsPlanned, 1),
        critical: true,
        href: "/hq/menu",
      }),
      makeCheck({
        id: "meals-have-dishes",
        label: "לכל ארוחה יש מנות",
        detail:
          menu.mealsPlanned - menu.mealsWithDishes === 0
            ? "לכל ארוחה יש לפחות מנה אחת"
            : `${menu.mealsPlanned - menu.mealsWithDishes} ארוחות בלי מנות`,
        done: menu.mealsWithDishes,
        total: Math.max(menu.mealsPlanned, 1),
        critical: true,
        href: "/hq/menu",
      }),
      makeCheck({
        id: "no-blocked-diners",
        label: "אין אנשים בלי אוכל",
        detail:
          menu.blockedDiners === 0
            ? "לכל אחד יש מה לאכול בכל ארוחה"
            : `${menu.blockedDiners} מקרים שבהם למישהו אין מה לאכול`,
        done: menu.blockedDiners === 0 ? 1 : 0,
        total: 1,
        critical: true,
        href: "/hq/menu",
      }),
    ]),

    makeArea("recipes", "מתכונים וכמויות", 15, [
      makeCheck({
        id: "dishes-with-recipe",
        label: "מנות עם מתכון",
        detail:
          recipes.dishesTotal === 0
            ? "עוד אין מנות"
            : recipes.dishesTotal - recipes.dishesWithRecipe === 0
              ? "לכל מנה יש מתכון"
              : `${recipes.dishesTotal - recipes.dishesWithRecipe} מנות בלי מתכון`,
        done: recipes.dishesWithRecipe,
        total: Math.max(recipes.dishesTotal, 1),
        critical: true,
        href: "/hq/recipes",
      }),
      makeCheck({
        id: "recipes-final",
        label: "כמויות סופיות",
        detail:
          recipes.recipesTotal === 0
            ? "עוד אין מתכונים"
            : `${recipes.recipesFinal} מתוך ${recipes.recipesTotal} מתכונים אושרו`,
        done: recipes.recipesFinal,
        total: Math.max(recipes.recipesTotal, 1),
        critical: false,
        href: "/hq/recipes",
      }),
    ]),

    makeArea("shifts", "משמרות", 15, [
      makeCheck({
        id: "positions-filled",
        label: "תקנים מאוישים",
        detail:
          shifts.positionsRequired === 0
            ? "עוד לא נוצרו משמרות"
            : shifts.positionsRequired - shifts.positionsFilled <= 0
              ? "כל המשמרות מאוישות"
              : `חסרים ${shifts.positionsRequired - shifts.positionsFilled} אנשים במשמרות`,
        done: shifts.positionsFilled,
        total: Math.max(shifts.positionsRequired, 1),
        critical: true,
        href: "/hq/shifts",
      }),
      makeCheck({
        id: "people-with-shift",
        label: "אנשים שבחרו משמרת",
        detail:
          shifts.peopleWithoutShift === 0
            ? "כולם בחרו משמרת"
            : `${shifts.peopleWithoutShift} אנשים עוד לא בחרו משמרת`,
        done: 1,
        total: shifts.peopleWithoutShift > 0 ? 2 : 1,
        critical: false,
        href: "/hq/shifts",
      }),
    ]),

    makeArea("shopping", "קניות", 20, [
      makeCheck({
        id: "shopping-bought",
        label: "פריטים שנקנו",
        detail:
          shopping.total === 0
            ? "רשימת הקניות עוד לא נוצרה"
            : `${shopping.bought} מתוך ${shopping.total} פריטים נקנו`,
        done: shopping.bought,
        total: Math.max(shopping.total, 1),
        critical: true,
        href: "/hq/shopping",
      }),
      makeCheck({
        id: "shopping-assigned",
        label: "פריטים עם אחראי",
        detail:
          shopping.unassigned === 0
            ? "לכל פריט שנשאר יש אחראי"
            : `${shopping.unassigned} פריטים בלי אחראי`,
        done: Math.max(shopping.total - shopping.unassigned, 0),
        total: Math.max(shopping.total, 1),
        critical: false,
        href: "/hq/shopping",
      }),
    ]),

    makeArea("budget", "תקציב", 10, [
      makeCheck({
        id: "budget-reviewed",
        label: "התקציב נבדק",
        detail: budget.reviewed
          ? "התקציב אושר על ידי מנהל.ת המטבח"
          : "התקציב עוד לא נבדק",
        done: budget.reviewed ? 1 : 0,
        total: 1,
        critical: false,
        href: "/hq/budget",
      }),
      makeCheck({
        id: "budget-within",
        label: "בתוך התקציב",
        detail:
          budget.totalBudget <= 0
            ? "עוד לא הוגדר תקציב"
            : budget.projected <= budget.totalBudget
              ? "התחזית בתוך התקציב"
              : `חריגה של ${Math.round(budget.projected - budget.totalBudget)} מהתקציב`,
        done:
          budget.totalBudget <= 0 || budget.projected <= budget.totalBudget
            ? 1
            : 0,
        total: 1,
        critical: false,
        href: "/hq/budget",
      }),
    ]),
  ];

  const totalWeight = areas.reduce((s, a) => s + a.weight, 0);
  const score = Math.round(
    (areas.reduce((s, a) => s + a.score * a.weight, 0) / totalWeight) * 100,
  );

  const allChecks = areas.flatMap((a) => a.checks);
  const blockers = allChecks.filter(
    (c) => c.critical && c.status !== "done",
  );
  const attention = allChecks.filter(
    (c) => !c.critical && c.status !== "done",
  );

  return {
    areas,
    score,
    blockers,
    attention,
    canLock: blockers.length === 0,
    locked: input.locked,
  };
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b - a) / 86_400_000);
}
