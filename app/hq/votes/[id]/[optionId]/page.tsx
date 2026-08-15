import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { voteOptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOptionDishes } from "@/lib/data/recipes";
import { costEvening } from "@/lib/data/costing";
import { defaultDiners, getSettings } from "@/lib/data/camp";
import { DishList, type DishView } from "@/app/hq/menu/[id]/DishEditor";
import { OptionTags } from "@/components/shmifting/OptionTags";
import { Glyph } from "@/components/shmifting/Glyph";
import { Panel } from "@/components/shmifting/surfaces";
import { money } from "@/lib/utils";

/* ============================================================================
   COSTING AN EVENING BEFORE IT WINS — Bible §22, §23

   The camp votes for weeks. The Kitchen Lead should spend those weeks finding
   out what the popular evenings actually cost, not waiting for a result and
   then discovering that ליל הודו is affordable and ערב אמריקאי is not.

   Everything on this page is a proposal. The dishes here hang off the vote
   option, not off a meal, so none of it reaches the shopping list, the budget
   or the printed pack — those all walk the menu. If the evening wins, promotion
   re-parents these dishes onto the new meal and the recipes travel with them.

   The number is costed against the camp head count, because that is who would
   eat it. It moves as people register, which is the point.
   ========================================================================= */

export default async function CostEveningPage({
  params,
}: PageProps<"/hq/votes/[id]/[optionId]">) {
  await requireAdmin();
  const { id: roundId, optionId } = await params;

  const [option, dishRows, diners, camp] = await Promise.all([
    db.query.voteOptions.findFirst({
      where: eq(voteOptions.id, optionId),
      with: { round: true },
    }),
    getOptionDishes(optionId),
    defaultDiners(),
    getSettings(),
  ]);

  if (!option || option.roundId !== roundId) notFound();

  const dishViews: DishView[] = dishRows.map((dish) => ({
    id: dish.id,
    name: dish.name,
    role: dish.role,
    dietary: dish.dietary,
    allergens: dish.allergens,
    notes: dish.notes,
    recipeId: dish.recipe?.id ?? null,
    recipeName: dish.recipe?.name ?? null,
    ingredientAllergens: [
      ...new Set(
        (dish.recipe?.items ?? []).flatMap((i) => i.ingredient.allergens),
      ),
    ],
  }));

  /* One calculation, shared with the round summary — see lib/data/costing.ts.
     Two copies would eventually disagree, and two different prices for the
     same evening on two screens is worse than no price at all. */
  const cost = await costEvening(option.id, diners);
  const { total: evening, perHead, uncosted: missing } = cost;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/hq/votes/${roundId}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-cream-dim transition-colors hover:text-cream"
        >
          <Glyph name="arrow" strokeWidth={2} />
          חזרה להצבעה
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 className="font-display text-2xl text-cream">{option.title}</h1>
          <OptionTags dietary={option.dietary} tags={option.tags} />
        </div>
        {option.description && (
          <p className="mt-1.5 max-w-2xl text-sm text-cream-2/80">
            {option.description}
          </p>
        )}
      </div>

      {/* ---- What it would cost --------------------------------------- */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] text-cream-dim">
              עלות משוערת לערב הזה, ל־{diners} סועדים
            </p>
            <p className="mt-1 font-display text-3xl text-cream tabular-nums">
              {money(evening, camp.currency)}
            </p>
            <p className="mt-1 text-[13px] text-cream-dim">
              {money(perHead, camp.currency)} לאדם
            </p>
          </div>

          {missing > 0 && (
            <p className="flex items-start gap-2 rounded-md border-2 border-attention/50 bg-attention/[0.07] px-3 py-2 text-[13px] leading-snug text-attention">
              <Glyph name="alert" strokeWidth={2.2} className="mt-0.5" />
              <span>
                {missing === dishRows.length
                  ? "עוד אין מתכונים — המספר הזה הוא אפס, לא זול."
                  : `${missing} מנות עדיין בלי מתכון, ולא נספרות במחיר.`}
              </span>
            </p>
          )}
        </div>
      </Panel>

      {/* ---- The written menu, for reference --------------------------- */}
      {option.dishes && (
        <Panel className="p-4">
          <p className="mb-2 text-[12px] text-cream-dim">
            התפריט כפי שהקמפ רואה אותו
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {option.dishes
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .map((line) => (
                <li
                  key={line}
                  className="rounded border border-charcoal-5 px-2 py-0.5 text-[12.5px] text-cream-dim"
                >
                  {line}
                </li>
              ))}
          </ul>
        </Panel>
      )}

      {/* ---- The dishes being costed ----------------------------------- */}
      <div>
        <h2 className="mb-3 font-display text-lg text-cream">
          מנות ומתכונים
        </h2>
        <DishList
          voteOptionId={option.id}
          dishes={dishViews}
          locked={Boolean(camp.lockedAt)}
          emptyNote="עוד לא תמחרתם את הערב הזה. הוסיפו מנות וכתבו להן מתכונים — הכול יעבור לתפריט אם הערב ינצח."
        />
      </div>

      <p className="text-[13px] leading-relaxed text-cream-dim">
        כל מה שכאן הוא הצעה. זה לא נכנס לרשימת הקניות ולא לתקציב עד שהערב ינצח
        בהצבעה — ואז המנות והמתכונים עוברים לתפריט כמו שהם.
      </p>
    </div>
  );
}
