import Link from "next/link";
import { getBudget, getShoppingList } from "@/lib/data/shopping";
import { getSettings, defaultDiners } from "@/lib/data/camp";
import { BudgetSettings, ReviewButton } from "./BudgetForms";
import { HqHeading, Metric, Table, Th, Td, Tr } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { Glyph } from "@/components/shmifting/Glyph";
import { categoryLabel } from "@/lib/domain/categories";
import { money, pct, cn } from "@/lib/utils";

export const metadata = { title: "תקציב — Kitchen HQ" };

/* ============================================================================
   BUDGET — Bible §24, §25, Design Book §44

   "Budget should remain calm. Do not gamify money excessively. Important
    numbers should dominate."

   Bible §25's distinction is the backbone: projected is what the plan costs,
   actual is what has been spent so far, and the page never blurs the two into
   a single reassuring figure.
   ========================================================================= */

export default async function BudgetPage() {
  const [budget, list, camp, diners] = await Promise.all([
    getBudget(),
    getShoppingList(),
    getSettings(),
    defaultDiners(),
  ]);

  const locked = Boolean(camp.lockedAt);
  const usedPct = budget.totalBudget > 0 ? pct(budget.projected, budget.totalBudget) : 0;
  const boughtRows = list.rows.filter((r) => r.status === "bought");

  /* Bible §25 — where estimates and reality have already diverged. */
  const drift = boughtRows
    .filter((r) => r.actualCost !== null)
    .map((r) => ({
      name: r.name,
      estimated: r.estimatedCost,
      actual: r.actualCost as number,
      delta: (r.actualCost as number) - r.estimatedCost,
    }))
    .filter((r) => Math.abs(r.delta) > 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const totalDrift = drift.reduce((s, d) => s + d.delta, 0);

  return (
    <div className="space-y-6">
      <HqHeading
        title="תקציב"
        lead="כמה המטבח הזה עולה, וכמה כבר יצא מהכיס. שני מספרים שונים שאסור לערבב."
        action={
          !locked && (
            <ReviewButton reviewed={budget.reviewed} />
          )
        }
      />

      {/* Design Book §44: important numbers dominate. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="תקציב כולל"
          value={
            budget.totalBudget > 0
              ? money(budget.totalBudget, budget.currency)
              : "—"
          }
          sub={
            /* Say where the ceiling came from. A pot from finance and a rate
               per head are different facts, and "₪8,000 מהכספים" is a
               sentence somebody can check. */
            budget.budgetSource === "total"
              ? `סכום מהכספים · ${money(budget.perPerson ?? 0, budget.currency)} לאדם`
              : budget.budgetSource === "perPerson"
                ? `${money(budget.perPerson ?? 0, budget.currency)} × ${budget.diners} אנשים`
                : "עוד לא הוגדר"
          }
          accent="cream"
        />
        <Metric
          label="תחזית עלות"
          value={money(budget.overall.projected, budget.currency)}
          sub={
            budget.totalBudget > 0
              ? budget.overBudget
                ? `חריגה של ${money(budget.projected - budget.totalBudget, budget.currency)}`
                : `נשאר ${money(budget.remaining, budget.currency)}`
              : "אין תקציב להשוות אליו"
          }
          tone={budget.overBudget ? "alarm" : undefined}
          accent="sun"
        />
        <Metric
          label="הוצאה בפועל"
          value={money(budget.spent, budget.currency)}
          sub={`${boughtRows.length} פריטים נקנו`}
          accent="good"
        />
        <Metric
          label="מזה ציוד"
          value={money(budget.equipment.projected, budget.currency)}
          sub={
            budget.equipment.outstanding > 0
              ? `${budget.equipment.outstanding} פריטים עוד בלי מקור`
              : `${budget.equipment.items} פריטים`
          }
          tone={budget.equipment.outstanding > 0 ? "attention" : undefined}
          accent="lavender"
          href="/hq/equipment"
        />
        <Metric
          label="עלות לאדם"
          value={money(budget.projectedPerPerson, budget.currency)}
          sub={
            budget.perPerson !== null && budget.perPerson > 0
              ? budget.projectedPerPerson > budget.perPerson
                ? `מעל היעד של ${money(budget.perPerson, budget.currency)}`
                : `מתחת ליעד של ${money(budget.perPerson, budget.currency)}`
              : "עוד לא נקבע יעד"
          }
          tone={
            budget.perPerson !== null &&
            budget.projectedPerPerson > budget.perPerson
              ? "attention"
              : undefined
          }
          accent="lavender"
        />
      </div>

      {budget.totalBudget > 0 && (
        <Panel title="איפה אנחנו עומדים" accent="sun">
          <div className="space-y-4 p-4">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-cream-2">
                  תחזית מול תקציב
                </span>
                <span className="tabular-nums text-cream-dim" dir="ltr">
                  {money(budget.projected, budget.currency)} /{" "}
                  {money(budget.totalBudget, budget.currency)}
                </span>
              </div>
              <div className="relative h-5 overflow-hidden rounded-full border-2 border-ink bg-charcoal-4">
                {/* Spent so far, inside the projection. */}
                <div
                  className="absolute inset-y-0 start-0 bg-good"
                  style={{
                    width: `${Math.min(100, pct(budget.spent, budget.totalBudget))}%`,
                  }}
                />
                <div
                  className={cn(
                    "absolute inset-y-0 bg-sun/50",
                    budget.overBudget && "bg-alarm/60",
                  )}
                  style={{
                    insetInlineStart: `${Math.min(100, pct(budget.spent, budget.totalBudget))}%`,
                    width: `${Math.min(
                      100 - Math.min(100, pct(budget.spent, budget.totalBudget)),
                      Math.max(0, usedPct - pct(budget.spent, budget.totalBudget)),
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-4 text-[12px]">
                <span className="flex items-center gap-1.5 text-cream-2">
                  <span className="h-2.5 w-2.5 rounded-full border border-ink bg-good" />
                  יצא מהכיס · {money(budget.spent, budget.currency)}
                </span>
                <span className="flex items-center gap-1.5 text-cream-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full border border-ink",
                      budget.overBudget ? "bg-alarm/60" : "bg-sun/50",
                    )}
                  />
                  מתוכנן ועוד לא נקנה · {money(budget.committed, budget.currency)}
                </span>
                <span className="flex items-center gap-1.5 text-cream-dim">
                  <span className="h-2.5 w-2.5 rounded-full border border-ink bg-charcoal-4" />
                  פנוי · {money(Math.max(0, budget.remaining), budget.currency)}
                </span>
              </div>
            </div>

            {budget.overBudget && (
              <p className="flex items-start gap-2 rounded-md border-2 border-alarm/60 border-s-[6px] border-s-alarm bg-alarm/[0.08] p-3 text-[13px] leading-snug text-cream-2">
                <Glyph name="alert" className="mt-0.5 text-alarm" strokeWidth={2.4} />
                <span>
                  התחזית חורגת ב־
                  {money(budget.projected - budget.totalBudget, budget.currency)}.
                  אפשר להעלות את התקציב לאדם, להחליף מנה יקרה, או להוריד כמויות
                  ב
                  <Link href="/hq/shopping" className="underline hover:text-cream">
                    רשימת הקניות
                  </Link>
                  .
                </span>
              </p>
            )}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="לפי קטגוריה" accent="terracotta">
          {budget.categories.length === 0 ? (
            <p className="p-4 text-sm text-cream-dim">
              אין עדיין עלויות. הן מגיעות מהמתכונים ומהפריטים הידניים.
            </p>
          ) : (
            <Table
              head={
                <>
                  <Th>קטגוריה</Th>
                  <Th numeric>תחזית</Th>
                  <Th numeric>בפועל</Th>
                  <Th numeric>מהתחזית</Th>
                </>
              }
            >
              {budget.categories.map((c) => (
                <Tr key={c.category}>
                  <Td className="text-cream">{categoryLabel(c.category)}</Td>
                  <Td numeric>{money(c.projected, budget.currency)}</Td>
                  <Td numeric className="text-good">
                    {c.actual > 0 ? money(c.actual, budget.currency) : "—"}
                  </Td>
                  <Td numeric className="text-cream-dim">
                    {pct(c.projected, budget.projected)}%
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel
          title="איפה ההערכה פספסה"
          accent="pink"
          action={
            drift.length > 0 && (
              <span
                className={cn(
                  "text-[12.5px] tabular-nums",
                  totalDrift > 0 ? "text-attention" : "text-good",
                )}
              >
                {totalDrift > 0 ? "+" : ""}
                {money(totalDrift, budget.currency)}
              </span>
            )
          }
        >
          {drift.length === 0 ? (
            <p className="p-4 text-sm text-cream-dim">
              עוד לא הוזנו עלויות אמיתיות. ככל שתמלאו כמה דברים באמת עלו,
              התחזית לפעם הבאה תהיה טובה יותר.
            </p>
          ) : (
            <Table
              head={
                <>
                  <Th>פריט</Th>
                  <Th numeric>הערכה</Th>
                  <Th numeric>בפועל</Th>
                  <Th numeric>הפרש</Th>
                </>
              }
            >
              {drift.slice(0, 12).map((d) => (
                <Tr key={d.name}>
                  <Td className="text-cream">{d.name}</Td>
                  <Td numeric className="text-cream-dim">
                    {money(d.estimated, budget.currency)}
                  </Td>
                  <Td numeric>{money(d.actual, budget.currency)}</Td>
                  <Td
                    numeric
                    className={d.delta > 0 ? "text-attention" : "text-good"}
                  >
                    {d.delta > 0 ? "+" : ""}
                    {money(d.delta, budget.currency)}
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>

      <Panel title="הגדרות תקציב" accent="dust-blue">
        <div className="p-4">
          <BudgetSettings
            budgetTotal={camp.budgetTotal}
            perPerson={camp.budgetPerPerson}
            diners={diners}
            dinersOverride={camp.expectedDiners}
            currency={camp.currency}
            locked={locked}
          />
        </div>
      </Panel>
    </div>
  );
}
