import { requireAdmin } from "@/lib/auth/guard";
import { getEquipmentByCategory, getEquipmentSummary } from "@/lib/data/equipment";
import { getSettings } from "@/lib/data/camp";
import { HqHeading, Metric } from "@/components/hq/primitives";
import { EmptyState } from "@/components/shmifting/EmptyState";
import { EquipmentBoard, type EquipmentView } from "./EquipmentBoard";
import { money } from "@/lib/utils";

export const metadata = { title: "ציוד — Kitchen HQ" };

/* ============================================================================
   THE KIT — Bible §24, §25

   A camp that budgets only for food meets the fridge on the day it needs one.
   Equipment is real money against the same pot, and it is the half nobody
   remembers until it is late: a fridge has to be booked, a gas balloon has to
   be filled, and somebody has to actually own the sentence "I am bringing the
   knives".

   Deliberately separate from the shopping list. These things do not scale with
   head count, most of them come back afterwards, and aggregating a fridge by
   ingredient is nonsense. What matters here is not quantity but certainty —
   which is why the status control is one click and sits first.
   ========================================================================= */

export default async function EquipmentPage() {
  await requireAdmin();

  const [groups, summary, camp] = await Promise.all([
    getEquipmentByCategory(),
    getEquipmentSummary(),
    getSettings(),
  ]);

  const views = groups.map((group) => ({
    key: group.key,
    label: group.label,
    items: group.items.map(
      (item): EquipmentView => ({
        id: item.id,
        name: item.name,
        category: item.category,
        acquisition: item.acquisition,
        quantity: item.quantity,
        estimatedCost: item.estimatedCost,
        actualCost: item.actualCost,
        status: item.status,
        supplier: item.supplier,
        link: item.link,
        notes: item.notes,
        cost: item.cost,
      }),
    ),
  }));

  return (
    <div className="space-y-6">
      <HqHeading
        title="ציוד המטבח"
        lead="מקרר, אש, סכינים, שולחנות. כל מה שצריך כדי לבשל — וכמה זה עולה."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="עלות ציוד"
          value={money(summary.projected, camp.currency)}
          sub={`${summary.items} פריטים`}
          accent="lavender"
        />
        <Metric
          label="כבר שולם"
          value={money(summary.spent, camp.currency)}
          sub="מתוך העלות המשוערת"
          accent="good"
        />
        <Metric
          label="עוד לא סגור"
          value={summary.outstanding}
          sub={
            summary.outstanding === 0
              ? "הכול מסודר"
              : "פריטים שאין להם מקור עדיין"
          }
          tone={summary.outstanding > 0 ? "attention" : undefined}
          accent="sun"
        />
        <Metric
          label="בלי עלות"
          value={summary.free}
          sub="שאילה או כבר שלנו"
          accent="dust-blue"
        />
      </div>

      {views.length === 0 ? (
        <EmptyState title="עוד לא רשמנו ציוד">
          מקרר, בלון גז, סכינים, שולחנות — כל מה שצריך כדי שיהיה איפה לבשל.
          הוסיפו פריט ראשון והעלות תיכנס ישר לתקציב.
          <div className="mt-4">
            <EquipmentBoard groups={[]} currency={camp.currency} />
          </div>
        </EmptyState>
      ) : (
        <EquipmentBoard groups={views} currency={camp.currency} />
      )}
    </div>
  );
}
