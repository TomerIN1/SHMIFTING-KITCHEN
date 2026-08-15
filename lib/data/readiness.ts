import "server-only";
import { cache } from "react";
import { computeReadiness } from "@/lib/domain/readiness";
import { getSettings, getBreakdown } from "./camp";
import { getMenuStats } from "./menu";
import { getShiftStats } from "./shifts";
import { getShoppingList, getBudget } from "./shopping";

/* ============================================================================
   READINESS — the convergence point of every other system (Bible §7, §31).
   ========================================================================= */

export const getReadiness = cache(async () => {
  const [camp, people, menu, shiftStats, shopping, budget] = await Promise.all([
    getSettings(),
    getBreakdown(),
    getMenuStats(),
    getShiftStats(),
    getShoppingList(),
    getBudget(),
  ]);

  return computeReadiness({
    people: {
      total: people.total,
      profilesComplete: people.profilesComplete,
      allergiesTotal: people.allergyCount,
      allergiesReviewed: people.allergyCount - people.unreviewedAllergies,
    },
    menu: {
      mealsPlanned: menu.total,
      mealsFinal: menu.final,
      mealsWithDishes: menu.withDishes,
      blockedDiners: menu.blockedDiners,
      mealsReviewedForCoverage: menu.final,
    },
    recipes: {
      dishesTotal: menu.dishesTotal,
      dishesWithRecipe: menu.dishesWithRecipe,
      recipesTotal: menu.recipesTotal,
      recipesFinal: menu.recipesFinal,
    },
    shifts: {
      positionsRequired: shiftStats.positionsRequired,
      positionsFilled: shiftStats.positionsFilled,
      shiftsTotal: shiftStats.shiftsTotal,
      shiftsUnderstaffed: shiftStats.understaffed,
      peopleWithoutShift: shiftStats.peopleWithoutShift,
    },
    shopping: {
      total: shopping.summary.total,
      bought: shopping.summary.bought,
      unassigned: shopping.summary.unassigned,
    },
    budget: {
      reviewed: budget.reviewed,
      totalBudget: budget.totalBudget,
      projected: budget.projected,
    },
    locked: Boolean(camp.lockedAt),
  });
});

/* ---------------------------------------------------------------------------
   MEMBER PROGRESS — Bible §35
   "Every Shmifter should have a simple sense of completion… Avoid unnecessary
    achievement systems, points, badges, streaks, leaderboards."

   Three real tasks. Nothing else. Each one is either done or it is the next
   thing to do.
   ------------------------------------------------------------------------ */

export interface MemberStep {
  key: "profile" | "vote" | "shift";
  label: string;
  detail: string;
  done: boolean;
  /* Open, but nothing is being asked of the member right now. */
  waiting: boolean;
  href: string;
  cta: string;
}

export interface MemberProgress {
  steps: MemberStep[];
  doneCount: number;
  total: number;
  /* The single obvious next action for the Home (Bible §9). */
  next: MemberStep | null;
  allDone: boolean;
}

export function buildMemberProgress(input: {
  profileComplete: boolean;
  openRounds: number;
  votedRounds: number;
  shiftsOpen: boolean;
  myShiftCount: number;
  quota: number;
}): MemberProgress {
  const votesPending = input.openRounds - input.votedRounds;

  const steps: MemberStep[] = [
    {
      key: "profile",
      label: "פרופיל האוכל",
      detail: input.profileComplete
        ? "המטבח יודע מה אתם אוכלים"
        : "ספרו לנו מה אתם אוכלים, וממה להיזהר",
      done: input.profileComplete,
      waiting: false,
      href: "/profile",
      cta: input.profileComplete ? "לעדכן את הפרופיל" : "למלא את הפרופיל",
    },
    {
      key: "vote",
      label: "הצבעות על אוכל",
      detail:
        input.openRounds === 0
          ? "אין הצבעה פתוחה כרגע"
          : votesPending <= 0
            ? "הצבעתם בכל ההצבעות הפתוחות"
            : `${votesPending} הצבעות מחכות לאש שלכם`,
      done: input.openRounds > 0 && votesPending <= 0,
      waiting: input.openRounds === 0,
      href: "/vote",
      cta: "לתת אש",
    },
    {
      key: "shift",
      label: "משמרת במטבח",
      /* Worded as an offer, not a quota. "0 מתוך 1" made a voluntary evening
         in the kitchen read like an unpaid debt. */
      detail: !input.shiftsOpen
        ? "בחירת המשמרות עוד לא נפתחה"
        : input.myShiftCount === 0
          ? "יש מקום בערבים, אם בא לכם"
          : input.myShiftCount === 1
            ? "אתם בפנים לערב אחד"
            : `אתם בפנים ל־${input.myShiftCount} ערבים`,
      done: input.shiftsOpen && input.myShiftCount >= input.quota,
      waiting: !input.shiftsOpen,
      href: "/shifts",
      cta: input.myShiftCount === 0 ? "להצטרף למשמרת" : "לראות את המשמרות",
    },
  ];

  const actionable = steps.filter((s) => !s.done && !s.waiting);

  return {
    steps,
    doneCount: steps.filter((s) => s.done).length,
    total: steps.length,
    next: actionable[0] ?? null,
    allDone: steps.every((s) => s.done || s.waiting) && actionable.length === 0,
  };
}
