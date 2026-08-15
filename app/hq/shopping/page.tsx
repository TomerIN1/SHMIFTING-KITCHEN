import Link from "next/link";
import Image from "next/image";
import { getShoppingList, groupByCategory } from "@/lib/data/shopping";
import { getPeople, getSettings } from "@/lib/data/camp";
import { HqHeading, Metric, Table, Th, ProgressBar } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { PanelEmpty } from "@/components/shmifting/EmptyState";
import { Glyph } from "@/components/shmifting/Glyph";
import { ShoppingItemRow, AddManualItemForm } from "./ShoppingRowUI";
import { categoryLabel } from "@/lib/domain/categories";
import { OBJECT } from "@/components/shmifting/assets";
import { money } from "@/lib/utils";

export const metadata = { title: "קניות — Kitchen HQ" };

/* ============================================================================
   THE MASTER SHOPPING LIST — Bible §26–§29

   Everything on this page is derived. Three recipes wanting tomatoes become
   one line, and that line updates itself when a recipe or a diner count
   changes. What is stored is only what a person decided: the override, the
   assignee, the status, the real price.

   Design Book §45 permits personality here — the illustrated category
   headers — while insisting the rows stay scannable.
   ========================================================================= */

export default async function ShoppingPage() {
  const [list, people, camp] = await Promise.all([
    getShoppingList(),
    getPeople(),
    getSettings(),
  ]);

  const locked = Boolean(camp.lockedAt);
  const groups = groupByCategory(list.rows);
  const peopleOptions = people.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <HqHeading
        title="רשימת הקניות"
        lead="כל המתכונים הסופיים מתאחדים לרשימה אחת. שלושה מתכונים שצריכים עגבניות הופכים לשורה אחת."
        action={!locked && <AddManualItemForm />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="פריטים"
          value={list.summary.total}
          sub={`${list.summary.bought} כבר נקנו`}
          accent="peach"
        />
        <Metric
          label="עוד לא נקנו"
          value={list.summary.needed + list.summary.assigned}
          sub={
            list.summary.unassigned > 0
              ? `${list.summary.unassigned} בלי אחראי`
              : "לכולם יש אחראי"
          }
          tone={list.summary.unassigned > 0 ? "attention" : undefined}
          accent="sun"
        />
        <Metric
          label="עלות משוערת"
          value={money(list.summary.estimatedTotal, camp.currency)}
          sub="לפי הכמויות הסופיות"
          accent="terracotta"
          href="/hq/budget"
        />
        <Metric
          label="הוצאה בפועל"
          value={money(
            list.rows
              .filter((r) => r.status === "bought")
              .reduce((s, r) => s + (r.actualCost ?? r.estimatedCost), 0),
            camp.currency,
          )}
          sub={`${list.summary.pctBought}% מהרשימה נקנתה`}
          accent="good"
        />
      </div>

      <ProgressBar
        done={list.summary.bought}
        total={Math.max(list.summary.total, 1)}
        tone="good"
        label="התקדמות הקניות"
        className="rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-3.5"
      />

      {/* Bible §40 — say plainly what is NOT in this list. */}
      {list.pendingMeals > 0 && (
        <div className="rounded-md border-2 border-attention/50 border-s-[6px] border-s-attention bg-attention/[0.07] p-3.5">
          <p className="flex items-center gap-2 font-display text-[15px] text-attention">
            <Glyph name="alert" strokeWidth={2.4} />
            {list.pendingMeals} ארוחות עוד לא סופיות
          </p>
          <p className="mt-1 text-[13px] leading-snug text-cream-2/85">
            {list.pendingLines > 0
              ? `${list.pendingLines} שורות מרכיבים לא נכללות ברשימה הזו, כי הארוחות שלהן עוד לא נסגרו.`
              : "אין להן עדיין מתכונים, אז אין מה להוסיף."}{" "}
            <Link href="/hq/menu" className="underline hover:text-cream">
              לסגור ארוחות
            </Link>
          </p>
        </div>
      )}

      {list.rows.length === 0 ? (
        <PanelEmpty>
          הרשימה ריקה. היא תתמלא לבד ברגע שיהיו ארוחות סופיות עם מתכונים —
          ובינתיים אפשר להוסיף פריטים ידניים כמו נייר סופג ושקיות זבל.
        </PanelEmpty>
      ) : (
        <div className="space-y-4">
          {groups.map(({ category, items }) => {
            const bought = items.filter((i) => i.status === "bought").length;
            const cost = items.reduce((s, i) => s + i.estimatedCost, 0);

            return (
              <Panel
                key={category}
                accent="peach"
                title={
                  <span className="flex items-center gap-2">
                    {category === "supplies" && (
                      <Image
                        src={OBJECT.shoppingBag}
                        alt=""
                        className="h-6 w-6 object-contain"
                      />
                    )}
                    {category === "produce" && (
                      <Image
                        src={OBJECT.vegTomato}
                        alt=""
                        className="h-6 w-6 object-contain"
                      />
                    )}
                    {categoryLabel(category)}
                  </span>
                }
                action={
                  <span className="text-[12.5px] tabular-nums text-cream-dim">
                    {bought}/{items.length} · {money(cost, camp.currency)}
                  </span>
                }
              >
                <Table
                  head={
                    <>
                      <Th>פריט</Th>
                      <Th numeric>כמות</Th>
                      <Th numeric>משוער</Th>
                      <Th numeric>בפועל</Th>
                      <Th>אחראי</Th>
                      <Th>מצב</Th>
                    </>
                  }
                >
                  {items.map((row) => (
                    <ShoppingItemRow
                      key={row.ingredientId ?? row.id ?? row.name}
                      row={row}
                      people={peopleOptions}
                      currency={camp.currency}
                      locked={locked}
                    />
                  ))}
                </Table>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
