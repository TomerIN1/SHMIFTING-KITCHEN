import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { voteRounds } from "@/lib/db/schema";
import { scaleRecipe } from "@/lib/domain/scaling";
import { defaultDiners, getSettings } from "./camp";
import { getOptionDishes } from "./recipes";

/* ============================================================================
   WHAT THE CAMP IS ABOUT TO ORDER

   One costing calculation, used by every screen that shows money about an
   evening. It lived inline on the costing page first; the moment the round
   summary needed the same number, keeping two copies would have guaranteed
   they disagreed — and two different prices for ליל הודו on two screens is
   worse than no price at all.

   Everything here prices PROPOSALS: dishes hanging off a vote option, which
   never reach the shopping list or the budget. That is why this file exists
   separately from lib/data/shopping.ts, which prices the committed menu. The
   two must never be added together — one is what we are buying, the other is
   what we are considering.

   Costed at the camp head count, because a proposal has no date and that is
   who would eat it if it won.
   ========================================================================= */

export interface EveningCost {
  total: number;
  perHead: number;
  /* Dishes with a recipe, and therefore a real price. */
  costed: number;
  /* Dishes named but not yet costed. Their price is unknown, NOT zero, and
     every screen showing the total has to say so. */
  uncosted: number;
}

export async function costEvening(
  voteOptionId: string,
  diners: number,
): Promise<EveningCost> {
  const dishes = await getOptionDishes(voteOptionId);

  let total = 0;
  let costed = 0;

  for (const dish of dishes) {
    if (!dish.recipe) continue;
    costed++;
    const scaled = scaleRecipe(
      dish.recipe.baseServings,
      diners,
      dish.recipe.items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        category: item.ingredient.category,
        quantity: item.quantity,
        unit: item.unit,
        scaledOverride: item.scaledOverride,
        defaultUnit: item.ingredient.defaultUnit,
        estimatedUnitCost: item.ingredient.estimatedUnitCost,
        allergens: item.ingredient.allergens,
      })),
    );
    total += scaled.totalCost;
  }

  return {
    total,
    perHead: diners > 0 ? total / diners : 0,
    costed,
    uncosted: dishes.length - costed,
  };
}

export interface RoundProjection {
  /* How many evenings the camp will actually cook. */
  nights: number;
  diners: number;
  currency: string;
  leading: {
    id: string;
    title: string;
    flames: number;
    cost: EveningCost;
  }[];
  /* The leading evenings added up — what the burn would cost if the vote
     closed right now. */
  total: number;
  perHead: number;
  /* Evenings in the winning set that nobody has priced yet. Until this is
     zero the total is a floor, not an estimate. */
  unpriced: number;
  /* Null when finance has not given a number yet. Everything above is still
     true and useful without it. */
  budgetTotal: number | null;
  budgetPerHead: number | null;
  remaining: number | null;
  overBudget: boolean;
}

export const getRoundProjection = cache(
  async (roundId: string): Promise<RoundProjection | null> => {
    const round = await db.query.voteRounds.findFirst({
      where: eq(voteRounds.id, roundId),
      with: { options: true, votes: true },
    });
    if (!round) return null;

    const [diners, camp] = await Promise.all([defaultDiners(), getSettings()]);

    const scored = round.options.map((option) => ({
      id: option.id,
      title: option.title,
      flames: round.votes
        .filter((v) => v.optionId === option.id)
        .reduce((s, v) => s + v.flames, 0),
    }));

    /* Same ordering as the member standings — flames, then name — so the
       Lead's "leading six" and the camp's "leading six" are the same six. */
    const ranked = [...scored].sort(
      (a, b) => b.flames - a.flames || a.title.localeCompare(b.title, "he"),
    );

    const nights = round.tokensPerVoter;
    const top = ranked.slice(0, nights);

    const leading = await Promise.all(
      top.map(async (option) => ({
        ...option,
        cost: await costEvening(option.id, diners),
      })),
    );

    const total = leading.reduce((s, e) => s + e.cost.total, 0);
    const unpriced = leading.filter((e) => e.cost.costed === 0).length;

    const budgetTotal =
      camp.budgetPerPerson > 0 ? camp.budgetPerPerson * diners : null;

    return {
      nights,
      diners,
      currency: camp.currency,
      leading,
      total,
      perHead: diners > 0 ? total / diners : 0,
      unpriced,
      budgetTotal,
      budgetPerHead: budgetTotal !== null ? camp.budgetPerPerson : null,
      remaining: budgetTotal !== null ? budgetTotal - total : null,
      overBudget: budgetTotal !== null && total > budgetTotal,
    };
  },
);
