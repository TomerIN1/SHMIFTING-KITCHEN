/* Must be first: it loads .env.local before ../lib/db reads the connection. */
import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { equipment } from "../lib/db/schema";
import { newId } from "../lib/utils";

/* ============================================================================
   WHAT A DESERT KITCHEN ACTUALLY NEEDS

   A starting list for a camp cooking six dinners for a few dozen people on
   burners, in dust, with no running water and no mains electricity. Written
   from what the job requires rather than from a catalogue: if it is here, a
   meal fails without it.

   Every item lands as `needed` with a price and no supplier. That is the
   honest starting state — the estimate says roughly what to budget, and the
   empty supplier field is the actual work: somebody has to ring round and
   find out where you rent a fridge in Be'er Sheva.

   Prices are Israeli 2026 estimates for the week, not quotes. Rental is
   priced for the whole burn, because that is how the quotes come back.

     npx tsx scripts/seed-equipment.ts
   ========================================================================= */

type Item = {
  name: string;
  category: string;
  acquisition: "rent" | "buy" | "borrow" | "have";
  quantity?: number;
  cost: number;
  notes?: string;
};

const KIT: Item[] = [
  /* ---- קירור — the thing that ruins a camp when it fails -------------- */
  { name: "מקרר 200 ליטר", category: "cold", acquisition: "rent", cost: 450,
    notes: "לבשר, חלב וכל מה שלא שורד יום במדבר" },
  { name: "צידניות גדולות", category: "cold", acquisition: "borrow", quantity: 4, cost: 0,
    notes: "מישהו בקמפ בטוח מביא" },
  { name: "קרח", category: "cold", acquisition: "buy", quantity: 20, cost: 15,
    notes: "מתכלה — לחשב לכל יום" },
  { name: "גנרטור", category: "cold", acquisition: "rent", cost: 900,
    notes: "המקרר לא עובד בלעדיו. לבדוק צריכת דלק" },

  /* ---- בישול ואש ------------------------------------------------------- */
  { name: "כירת גז תעשייתית 2 להבות", category: "heat", acquisition: "rent", quantity: 2, cost: 180 },
  { name: "בלון גז 12 ק״ג", category: "heat", acquisition: "rent", quantity: 2, cost: 120,
    notes: "כולל מילוי. לוודא ווסת ותקינות צינור" },
  { name: "מנגל גדול", category: "heat", acquisition: "borrow", cost: 0,
    notes: "לערב על האש" },
  { name: "סיר 20 ליטר", category: "heat", acquisition: "rent", quantity: 2, cost: 60,
    notes: "בלי זה אי אפשר לבשל לארבעים איש" },
  { name: "מחבת ענקית / פלנצ׳ה", category: "heat", acquisition: "rent", cost: 150,
    notes: "לשניצלים ולבורגרים" },
  { name: "מטף כיבוי", category: "heat", acquisition: "buy", cost: 150,
    notes: "לא אופציונלי כשיש גז ואש פתוחה" },

  /* ---- הכנה וחיתוך ----------------------------------------------------- */
  { name: "סכיני שף", category: "prep", acquisition: "borrow", quantity: 4, cost: 0,
    notes: "עדיף שכל אחד יביא את שלו ויסמן אותו" },
  { name: "קרשי חיתוך", category: "prep", acquisition: "buy", quantity: 4, cost: 35,
    notes: "אחד נפרד לבשר" },
  { name: "קערות ערבוב גדולות", category: "prep", acquisition: "borrow", quantity: 6, cost: 0 },
  { name: "מיכלי מים 20 ליטר", category: "prep", acquisition: "buy", quantity: 4, cost: 90,
    notes: "מים לבישול ולשטיפה — נפרד ממי שתייה" },
  { name: "פומפייה ומעבד ידני", category: "prep", acquisition: "borrow", cost: 0 },
  { name: "מאזניים מטבח", category: "prep", acquisition: "borrow", cost: 0,
    notes: "המתכונים בקילו — בלי זה מנחשים" },

  /* ---- הגשה ------------------------------------------------------------ */
  { name: "גסטרונומים לחימום והגשה", category: "serve", acquisition: "rent", quantity: 6, cost: 25 },
  { name: "כפות הגשה ומצקות", category: "serve", acquisition: "buy", quantity: 8, cost: 15 },
  { name: "צלחות רב־פעמיות", category: "serve", acquisition: "have", quantity: 50, cost: 0,
    notes: "כל אחד מביא את הצלחת שלו — פחות זבל במדבר" },
  { name: "שולחן הגשה מתקפל", category: "serve", acquisition: "rent", quantity: 2, cost: 70 },

  /* ---- שטיפה וניקיון --------------------------------------------------- */
  { name: "עמדת שטיפה / כיור נייד", category: "wash", acquisition: "rent", cost: 300,
    notes: "שלוש קערות: סבון, שטיפה, חיטוי" },
  { name: "מיכל מים אפורים", category: "wash", acquisition: "buy", cost: 200,
    notes: "לא שופכים לחול. חוק MOOP" },
  { name: "פחי אשפה גדולים", category: "wash", acquisition: "buy", quantity: 4, cost: 45 },

  /* ---- שולחנות ומבנה --------------------------------------------------- */
  { name: "שולחנות עבודה מתקפלים", category: "structure", acquisition: "rent", quantity: 3, cost: 70,
    notes: "משטח עבודה זה מה שנגמר ראשון" },
  { name: "צל למטבח", category: "structure", acquisition: "borrow", cost: 0,
    notes: "בלי צל אי אפשר לעבוד בצהריים" },
  { name: "תאורה ופנסים", category: "structure", acquisition: "buy", quantity: 4, cost: 60,
    notes: "המשמרות הן 16:30–20:00. חצי מהן בחושך" },
  { name: "ארגזי אחסון אטומים", category: "structure", acquisition: "buy", quantity: 6, cost: 55,
    notes: "אבק נכנס לכל דבר שלא סגור" },
];

async function main() {
  let added = 0;
  let sortOrder = 0;

  for (const item of KIT) {
    const existing = await db.query.equipment.findFirst({
      where: eq(equipment.name, item.name),
    });
    if (existing) {
      sortOrder++;
      continue;
    }

    await db.insert(equipment).values({
      id: newId(),
      name: item.name,
      category: item.category,
      acquisition: item.acquisition,
      quantity: item.quantity ?? 1,
      estimatedCost: item.cost,
      notes: item.notes ?? null,
      status: "needed",
      sortOrder: sortOrder++,
    });
    added++;
  }

  const all = await db.query.equipment.findMany();
  const priced = all.filter(
    (i) => i.acquisition === "rent" || i.acquisition === "buy",
  );
  const projected = priced.reduce(
    (s, i) => s + i.estimatedCost * i.quantity,
    0,
  );

  console.log(`${added} added · ${all.length} items on the list`);
  console.log(`estimated equipment cost: ₪${projected.toLocaleString()}`);
  console.log(
    `${all.length - priced.length} borrowed or already owned, ${all.length} still need a supplier`,
  );
  console.log("Prices are estimates. The real work is filling in where from.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
