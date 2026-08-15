import Link from "next/link";
import { Glyph } from "@/components/shmifting/Glyph";
import { Panel } from "@/components/shmifting/surfaces";
import { money, cn } from "@/lib/utils";
import type { RoundProjection } from "@/lib/data/costing";

/* ============================================================================
   IF THE VOTE CLOSED RIGHT NOW — Bible §22, §24

   The one question the Kitchen Lead cannot answer from anywhere else: the camp
   is choosing these six evenings, can we pay for them?

   It deliberately shows a total even when the budget is unknown, because the
   causality usually runs backwards from how people expect. You do not ask
   finance for a number and then find a menu to fit it — you cost the menu the
   camp wants and walk in with "about ₪180 a head, can we have that?". A number
   somebody has to react to is a much better question than an open one.

   Unpriced evenings are named rather than quietly counted as free. A total
   that silently treats four unwritten recipes as ₪0 is not an estimate, it is
   a lie with a currency symbol on it (Bible §24).
   ========================================================================= */

export function Projection({
  data,
  roundId,
}: {
  data: RoundProjection;
  roundId: string;
}) {
  const {
    nights,
    diners,
    currency,
    leading,
    total,
    perHead,
    unpriced,
    budgetTotal,
    budgetPerHead,
    remaining,
    overBudget,
  } = data;

  const anyCosted = leading.some((e) => e.cost.costed > 0);
  const partial = unpriced > 0 && anyCosted;

  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] text-cream">
          אם ההצבעה תיסגר עכשיו
        </h2>
        <span className="text-[12px] text-cream-dim">
          {nights} ערבים · {diners} סועדים
        </span>
      </div>

      {!anyCosted ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border-2 border-charcoal-5 bg-charcoal-2 px-3 py-2.5 text-[13px] leading-snug text-cream-dim">
          <Glyph name="coin" strokeWidth={2.2} className="mt-0.5 shrink-0" />
          <span>
            אף ערב עוד לא תומחר, אז אין מה לחשב. פתחו ערב מהרשימה למטה, הוסיפו
            לו מנות ומתכונים — והמספר יופיע כאן.
          </span>
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-[12px] text-cream-dim">עלות מוערכת לכל הבורן</p>
              <p
                className={cn(
                  "mt-0.5 font-display text-3xl tabular-nums",
                  overBudget ? "text-alarm" : "text-cream",
                )}
              >
                {money(total, currency)}
              </p>
              <p className="mt-0.5 text-[12.5px] text-cream-dim">
                {money(perHead, currency)} לאדם
              </p>
            </div>

            {budgetTotal === null ? (
              /* No ceiling yet. Say what to do with the number rather than
                 leaving a blank where the comparison should be. */
              <div className="max-w-xs">
                <p className="text-[12px] text-cream-dim">מול התקציב</p>
                <p className="mt-0.5 text-[13px] leading-snug text-cream-2">
                  עוד לא הוגדר תקציב. קחו את המספר הזה לשיחה עם הכספים — ואז{" "}
                  <Link
                    href="/hq/budget"
                    className="underline underline-offset-4 hover:text-sun"
                  >
                    הזינו תקציב לאדם
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[12px] text-cream-dim">
                  מול תקציב של {money(budgetPerHead ?? 0, currency)} לאדם
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-display text-2xl tabular-nums",
                    overBudget ? "text-alarm" : "text-good",
                  )}
                >
                  {overBudget ? "−" : ""}
                  {money(Math.abs(remaining ?? 0), currency)}
                </p>
                <p className="mt-0.5 text-[12.5px] text-cream-dim">
                  {overBudget ? "חריגה" : "נשאר"} מתוך{" "}
                  {money(budgetTotal, currency)}
                </p>
              </div>
            )}
          </div>

          {partial && (
            <p className="mt-3 flex items-start gap-2 rounded-md border-2 border-attention/50 bg-attention/[0.07] px-3 py-2 text-[13px] leading-snug text-attention">
              <Glyph name="alert" strokeWidth={2.2} className="mt-0.5 shrink-0" />
              <span>
                {unpriced} מהערבים המובילים עוד בלי מתכונים. המספר למעלה הוא רצפה,
                לא הערכה — הוא רק יעלה.
              </span>
            </p>
          )}
        </>
      )}

      {/* The leading evenings, each with its own price and a way in. */}
      <ul className="mt-4 space-y-1.5">
        {leading.map((evening, i) => (
          <li key={evening.id}>
            <Link
              href={`/hq/votes/${roundId}/${evening.id}`}
              className="flex items-center gap-3 rounded-md border border-charcoal-5 px-3 py-2 transition-colors hover:border-sun/60"
            >
              <span className="w-4 shrink-0 text-[12px] text-cream-dim tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-cream">
                {evening.title}
              </span>
              <span className="shrink-0 text-[12px] text-cream-dim tabular-nums">
                {evening.flames} 🔥
              </span>
              <span
                className={cn(
                  "w-24 shrink-0 text-end text-[13px] tabular-nums",
                  evening.cost.costed === 0 ? "text-cream-dim" : "text-cream",
                )}
              >
                {evening.cost.costed === 0
                  ? "לא תומחר"
                  : money(evening.cost.total, currency)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
