/* Must be first: it loads .env.local before ../lib/db reads the connection. */
import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { ingredients } from "../lib/db/schema";
import { newId } from "../lib/utils";

/* ============================================================================
   THE INGREDIENT CATALOGUE

   Nothing downstream of a recipe works without this. Quantities aggregate
   across recipes by ingredient (Bible §20), the shopping list is that
   aggregation, and the budget is the shopping list priced — so an empty
   catalogue makes three screens render correctly as zero, which reads exactly
   like they are broken.

   Every row carries four things the rest of the product reads:

     defaultUnit        the unit its price is quoted in. Aggregation may land
                        on a different unit in the same dimension (500 g, not
                        0.5 kg), and convertUnitCost() restates the price —
                        skipping that once produced a ₪39,894 projection.
     estimatedUnitCost  shekels per that unit. See the note on prices below.
     allergens          canonical keys. This column is the entire reason
                        "which dishes conflict with this allergy?" has an
                        answer (Bible §11).
     category           which aisle it is bought in, which is how the printed
                        shopping list is ordered so nobody walks the shop
                        twice.

   ── ON THE PRICES ────────────────────────────────────────────────────────
   These are realistic Israeli supermarket prices for 2026, and they are
   ESTIMATES. They exist so the budget has a shape from day one rather than
   sitting at zero until somebody types ninety numbers. They are not a quote.

   Expect them to be wrong in both directions: buying eighty kilos at a shuk
   or a wholesaler beats these, and a late run to a makolet beats nothing.
   The Kitchen Lead corrects any line in HQ, and `shoppingItems.actualCost`
   records what was really paid without touching the estimate (Bible §23) —
   so the budget learns as you shop instead of arguing with you.

   Allergen keys are conservative on purpose. Tahini carries sesame, anything
   with wheat carries gluten, and חומוס/עדשים/שעועית all carry legumes, which
   matters more in this camp than it looks: קטניות is a real restriction here,
   not a rare allergy.

     npx tsx scripts/seed-ingredients.ts          (adds what is missing)
     npx tsx scripts/seed-ingredients.ts --prices (also refreshes prices)
   ========================================================================= */

type Row = {
  name: string;
  category: string;
  unit: string;
  cost: number;
  allergens?: string[];
  notes?: string;
};

const CATALOGUE: Row[] = [
  /* ---- בשר ועוף — the expensive half of any camp budget --------------- */
  { name: "חזה עוף", category: "refrigerated", unit: "kg", cost: 45 },
  { name: "פרגיות", category: "refrigerated", unit: "kg", cost: 38 },
  { name: "כנפיים עוף", category: "refrigerated", unit: "kg", cost: 26 },
  { name: "שוקיים עוף", category: "refrigerated", unit: "kg", cost: 24 },
  { name: "בשר בקר טחון", category: "refrigerated", unit: "kg", cost: 55 },
  { name: "אנטריקוט", category: "refrigerated", unit: "kg", cost: 135 },
  { name: "בשר בקר לבישול ארוך", category: "refrigerated", unit: "kg", cost: 60 },
  { name: "קבב טרי", category: "refrigerated", unit: "kg", cost: 65 },
  { name: "נקניקיות", category: "refrigerated", unit: "kg", cost: 45 },

  /* ---- חלבון צמחי ---------------------------------------------------- */
  { name: "טופו", category: "refrigerated", unit: "kg", cost: 28, allergens: ["soy"] },
  { name: "חומוס יבש", category: "dry", unit: "kg", cost: 12, allergens: ["legumes"] },
  { name: "עדשים כתומות", category: "dry", unit: "kg", cost: 15, allergens: ["legumes"] },
  { name: "עדשים ירוקות", category: "dry", unit: "kg", cost: 14, allergens: ["legumes"] },
  { name: "שעועית שחורה", category: "dry", unit: "kg", cost: 17, allergens: ["legumes"] },
  { name: "פול יבש", category: "dry", unit: "kg", cost: 13, allergens: ["legumes"] },
  { name: "אפונה קפואה", category: "refrigerated", unit: "kg", cost: 14, allergens: ["legumes"] },

  /* ---- ירקות --------------------------------------------------------- */
  { name: "עגבניות", category: "produce", unit: "kg", cost: 9, allergens: ["nightshade"] },
  { name: "מלפפונים", category: "produce", unit: "kg", cost: 8 },
  { name: "בצל", category: "produce", unit: "kg", cost: 5 },
  { name: "בצל סגול", category: "produce", unit: "kg", cost: 8 },
  { name: "שום", category: "produce", unit: "kg", cost: 28 },
  { name: "תפוחי אדמה", category: "produce", unit: "kg", cost: 6, allergens: ["nightshade"] },
  { name: "בטטה", category: "produce", unit: "kg", cost: 10 },
  { name: "גזר", category: "produce", unit: "kg", cost: 5 },
  { name: "חציל", category: "produce", unit: "kg", cost: 8, allergens: ["nightshade"] },
  { name: "פלפל אדום", category: "produce", unit: "kg", cost: 13, allergens: ["nightshade"] },
  { name: "פלפל ירוק", category: "produce", unit: "kg", cost: 11, allergens: ["nightshade"] },
  { name: "קישוא", category: "produce", unit: "kg", cost: 7 },
  { name: "כרוב לבן", category: "produce", unit: "kg", cost: 5 },
  { name: "כרוב סגול", category: "produce", unit: "kg", cost: 7 },
  { name: "חסה", category: "produce", unit: "unit", cost: 6 },
  { name: "תרד קפוא", category: "refrigerated", unit: "kg", cost: 14 },
  { name: "פטריות שמפיניון", category: "produce", unit: "kg", cost: 22 },
  { name: "לימונים", category: "produce", unit: "kg", cost: 11, allergens: ["citrus"] },
  { name: "כוסברה", category: "produce", unit: "bunch", cost: 4 },
  { name: "פטרוזיליה", category: "produce", unit: "bunch", cost: 4 },
  { name: "נענע", category: "produce", unit: "bunch", cost: 4 },
  { name: "בזיליקום", category: "produce", unit: "bunch", cost: 6 },
  { name: "צ׳ילי חריף", category: "produce", unit: "kg", cost: 20, allergens: ["nightshade"] },
  { name: "ג׳ינג׳ר", category: "produce", unit: "kg", cost: 30 },
  { name: "אבוקדו", category: "produce", unit: "kg", cost: 16 },
  { name: "רימונים", category: "produce", unit: "kg", cost: 15 },

  /* ---- מקרר ---------------------------------------------------------- */
  { name: "ביצים", category: "refrigerated", unit: "tray", cost: 16, allergens: ["eggs"], notes: "מגש 30" },
  { name: "יוגורט טבעי", category: "refrigerated", unit: "kg", cost: 13, allergens: ["dairy"] },
  { name: "שמנת חמוצה", category: "refrigerated", unit: "kg", cost: 18, allergens: ["dairy"] },
  { name: "גבינה צהובה", category: "refrigerated", unit: "kg", cost: 62, allergens: ["dairy"] },
  { name: "גבינת פטה", category: "refrigerated", unit: "kg", cost: 45, allergens: ["dairy"] },
  { name: "חלומי", category: "refrigerated", unit: "kg", cost: 70, allergens: ["dairy"] },
  { name: "פרמזן", category: "refrigerated", unit: "kg", cost: 95, allergens: ["dairy"] },
  { name: "חמאה", category: "refrigerated", unit: "kg", cost: 55, allergens: ["dairy"] },
  { name: "גבינה לבנה", category: "refrigerated", unit: "kg", cost: 20, allergens: ["dairy"] },

  /* ---- יבשים --------------------------------------------------------- */
  { name: "אורז לבן", category: "dry", unit: "kg", cost: 10 },
  { name: "אורז בסמטי", category: "dry", unit: "kg", cost: 17 },
  { name: "אורז יסמין", category: "dry", unit: "kg", cost: 18 },
  { name: "פסטה", category: "dry", unit: "kg", cost: 9, allergens: ["gluten"] },
  { name: "אטריות אורז", category: "dry", unit: "kg", cost: 22 },
  { name: "קוסקוס", category: "dry", unit: "kg", cost: 14, allergens: ["gluten"] },
  { name: "בורגול", category: "dry", unit: "kg", cost: 12, allergens: ["gluten"] },
  { name: "קמח", category: "dry", unit: "kg", cost: 6, allergens: ["gluten"] },
  { name: "פירורי לחם", category: "dry", unit: "kg", cost: 13, allergens: ["gluten"] },
  { name: "פולנטה", category: "dry", unit: "kg", cost: 14 },
  { name: "שמן קנולה", category: "dry", unit: "l", cost: 13 },
  { name: "שמן זית", category: "dry", unit: "l", cost: 48 },
  { name: "טחינה גולמית", category: "dry", unit: "kg", cost: 30, allergens: ["sesame"] },
  { name: "חלב קוקוס", category: "dry", unit: "can", cost: 8 },
  { name: "רסק עגבניות", category: "dry", unit: "can", cost: 7, allergens: ["nightshade"] },
  { name: "עגבניות מרוסקות", category: "dry", unit: "can", cost: 6, allergens: ["nightshade"] },
  { name: "זיתים", category: "dry", unit: "kg", cost: 25 },
  { name: "חמוצים", category: "dry", unit: "kg", cost: 18 },
  { name: "בוטנים", category: "dry", unit: "kg", cost: 30, allergens: ["peanuts"] },
  { name: "שקדים", category: "dry", unit: "kg", cost: 65, allergens: ["tree_nuts"] },
  { name: "שומשום", category: "dry", unit: "kg", cost: 25, allergens: ["sesame"] },
  { name: "סוכר", category: "dry", unit: "kg", cost: 6 },
  { name: "דבש", category: "dry", unit: "kg", cost: 45 },
  { name: "חומץ", category: "dry", unit: "l", cost: 9 },
  { name: "רוטב סויה", category: "dry", unit: "l", cost: 22, allergens: ["soy", "gluten"] },
  { name: "עמבה", category: "dry", unit: "kg", cost: 24 },
  { name: "שזיפים מיובשים", category: "dry", unit: "kg", cost: 32, allergens: ["sulfites"] },

  /* ---- מאפייה -------------------------------------------------------- */
  { name: "פיתות", category: "bakery", unit: "package", cost: 12, allergens: ["gluten"], notes: "10 בחבילה" },
  { name: "לאפות", category: "bakery", unit: "package", cost: 16, allergens: ["gluten"] },
  { name: "לחמניות המבורגר", category: "bakery", unit: "package", cost: 17, allergens: ["gluten", "sesame"] },
  { name: "טורטיות", category: "bakery", unit: "package", cost: 18, allergens: ["gluten"] },
  { name: "נאן", category: "bakery", unit: "package", cost: 20, allergens: ["gluten", "dairy"] },
  { name: "לחם", category: "bakery", unit: "unit", cost: 12, allergens: ["gluten"] },

  /* ---- תבלינים — bought in small amounts, priced per kilo ------------- */
  { name: "מלח", category: "spices", unit: "kg", cost: 5 },
  { name: "פלפל שחור", category: "spices", unit: "kg", cost: 90 },
  { name: "כמון", category: "spices", unit: "kg", cost: 60 },
  { name: "פפריקה מתוקה", category: "spices", unit: "kg", cost: 50 },
  { name: "פפריקה חריפה", category: "spices", unit: "kg", cost: 55 },
  { name: "כורכום", category: "spices", unit: "kg", cost: 55 },
  { name: "אבקת קארי", category: "spices", unit: "kg", cost: 65 },
  { name: "גרם מסאלה", category: "spices", unit: "kg", cost: 80 },
  { name: "בהרט", category: "spices", unit: "kg", cost: 70 },
  { name: "אורגנו יבש", category: "spices", unit: "kg", cost: 95 },
  { name: "קינמון", category: "spices", unit: "kg", cost: 70 },
  { name: "עלי דפנה", category: "spices", unit: "kg", cost: 90 },
  { name: "אבקת מרק ירקות", category: "spices", unit: "kg", cost: 35, allergens: ["celery"] },

  /* ---- ציוד — not food, but it is on the same shopping run ------------ */
  { name: "נייר אפייה", category: "supplies", unit: "package", cost: 15 },
  { name: "נייר אלומיניום", category: "supplies", unit: "package", cost: 18 },
  { name: "שקיות זבל", category: "supplies", unit: "package", cost: 22 },
  { name: "כפפות חד״פ", category: "supplies", unit: "package", cost: 20 },
  { name: "סבון כלים", category: "supplies", unit: "bottle", cost: 14 },
  { name: "ספוגים", category: "supplies", unit: "package", cost: 12 },
  { name: "גחלים", category: "supplies", unit: "package", cost: 35 },
];

async function main() {
  const refreshPrices = process.argv.includes("--prices");

  let added = 0;
  let repriced = 0;

  for (const row of CATALOGUE) {
    const existing = await db.query.ingredients.findFirst({
      where: eq(ingredients.name, row.name),
    });

    if (existing) {
      /* Never overwrite silently. A Lead who corrected a price after standing
         in an actual shop knows more than this file does (Bible §23). */
      if (refreshPrices && existing.estimatedUnitCost !== row.cost) {
        await db
          .update(ingredients)
          .set({ estimatedUnitCost: row.cost })
          .where(eq(ingredients.id, existing.id));
        repriced++;
      }
      continue;
    }

    await db.insert(ingredients).values({
      id: newId(),
      name: row.name,
      category: row.category,
      defaultUnit: row.unit,
      estimatedUnitCost: row.cost,
      allergens: row.allergens ?? [],
      notes: row.notes ?? null,
    });
    added++;
  }

  const total = await db.query.ingredients.findMany();
  const withAllergens = total.filter((i) => i.allergens.length > 0).length;

  console.log(`${added} added${refreshPrices ? `, ${repriced} repriced` : ""}`);
  console.log(`catalogue: ${total.length} ingredients, ${withAllergens} carrying allergens`);
  console.log("Prices are estimates — correct them in HQ once you have real quotes.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
