/* Must be first: it loads .env.local before ../lib/db reads the connection. */
import "./load-env";
import { eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { voteRounds, voteOptions } from "../lib/db/schema";
import { newId } from "../lib/utils";

/* ============================================================================
   PICK YOUR EVENINGS

   One round. Twelve evenings, each a whole night with its menu already
   written. Every member gets as many flames as the camp has dinners and can
   spend at most one on any night — so a vote is not an allocation puzzle, it
   is the sentence "these are my five evenings". Count the flames and you have
   the menu; there is nothing left to interpret.

   That is the whole design. Two earlier attempts were more clever and both
   were worse:

     · A round per cuisine with six mains inside assumed the cuisines were
       already chosen — but choosing them is the interesting decision, and it
       left the Kitchen Lead making it alone.
     · Voting the cuisine AND the main meant fourteen screens to get through
       before anybody had said anything about Wednesday.

   The menus here are closed on purpose. A member votes for an evening as a
   whole — the smell of it, the thing they picture — not for a dish they will
   then argue about. The Lead can still edit any line in HQ, and a member who
   thinks the list forgot something can add a night themselves.

   Every evening carries a vegan main among its dishes, tagged so a vegan can
   see it without reading the menu (Bible §17). Not a garnish next to the meat:
   falafel, dal, caponata, charred aubergines — dishes people would choose.

     npx tsx scripts/seed-cuisines.ts            (adds what is missing)
     npx tsx scripts/seed-cuisines.ts --reset    (rebuilds the round)
   ========================================================================= */

const ROUND_TITLE = "הערבים של שמיפטינג";

/* The rounds built by the previous two designs. Removed on sight so the camp
   is never shown two competing ways to vote on the same thing. */
const SUPERSEDED = [
  "ערב לכל טעם",
  "הערב הישראלי",
  "ליל הודו",
  "על האש",
  "ערב מקסיקני",
  "ערב אמריקאי",
  "ערב תאילנדי",
  "ערב איטלקי",
];

interface Evening {
  title: string;
  description: string;
  /* The closed menu, one dish per line. */
  menu: string[];
  tags: string[];
}

const EVENINGS: Evening[] = [
  {
    title: "הערב הישראלי",
    description: "שניצלים במחבת, תור שנוצר מעצמו, וכולם מרגישים בבית.",
    menu: [
      "שניצלים מטוגנים במקום",
      "פירה חמאתי",
      "סלט ישראלי קצוץ דק",
      "פלאפל חם (טבעוני)",
      "חומוס, טחינה וחמוצים",
    ],
    tags: ["vegan-option", "gluten"],
  },
  {
    title: "על האש",
    description: "מנגל, עשן, וכל הקמפ עומד מסביב לרשת. הכי ישראלי שיש.",
    menu: [
      "פרגיות וקבב בשיפודים",
      "חצילים שלמים על הגחלים (טבעוני)",
      "שיפודי טופו וירקות (טבעוני)",
      "לאפות, טחינה וסלט ערבי",
      "בצל סגול וחמוצים",
    ],
    tags: ["vegan-option", "gluten-free"],
  },
  {
    title: "ליל הודו",
    description: "סיר אחד שמריח על כל הקמפ שלוש שעות לפני שאוכלים.",
    menu: [
      "בטר צ׳יקן",
      "דאל טאדקה (טבעוני)",
      "צ׳אנה מסאלה (טבעוני)",
      "אורז בסמטי",
      "יוגורט, מלפפון ונאן",
    ],
    tags: ["vegan-option", "spicy"],
  },
  {
    title: "ערב מקסיקני",
    description: "כל אחד בונה לעצמו. הכי מהיר להאכיל בו את כל הקמפ.",
    menu: [
      "טאקוס בשר טחון",
      "טאקוס שעועית שחורה ובטטה (טבעוני)",
      "גוואקמולי וסלסה חריפה",
      "טורטיות חמות",
      "אורז ולימון",
    ],
    tags: ["vegan-option", "spicy", "gluten-free"],
  },
  {
    title: "ערב אמריקאי",
    description: "בורגרים, ורוטב שנוזל על הידיים. בלי להתנצל.",
    menu: [
      "המבורגרים על הפלנצ׳ה",
      "בורגר עדשים וסלק (טבעוני)",
      "בצל מקורמל וחמוצים",
      "צ׳יפס",
      "קולסלו",
    ],
    tags: ["vegan-option", "gluten"],
  },
  {
    title: "ערב איטלקי",
    description: "פסטה לכל הקמפ מסיר אחד. הדבר הכי מנחם שיש.",
    menu: [
      "פסטה בולונז",
      "פסטה ארביאטה (טבעוני, חריף)",
      "קפונטה סיציליאנית (טבעוני)",
      "לחם שום",
      "סלט ירוק ופרמזן",
    ],
    tags: ["vegan-option", "spicy", "gluten"],
  },
  {
    title: "ערב תאילנדי",
    description: "חריף, חמצמץ ומרענן — בדיוק כשנמאס מהאבק.",
    menu: [
      "קארי אדום עם עוף",
      "קארי ירוק ירקות וטופו (טבעוני)",
      "אטריות אורז ובוטנים",
      "אורז יסמין",
      "סלט כרוב חריף",
    ],
    tags: ["vegan-option", "spicy", "gluten-free"],
  },
  {
    title: "ערב מרוקאי",
    description: "טאג׳ין שמתבשל לאט בזמן שהשמש יורדת. ריח שעוצר אנשים.",
    menu: [
      "טאג׳ין ירקות ושזיפים (טבעוני)",
      "קוסקוס",
      "חריימה",
      "סלטים כבושים",
      "מרק ירקות",
    ],
    tags: ["vegan-option", "spicy", "gluten"],
  },
  {
    title: "ערב יווני",
    description: "לימון, אורגנו וים תיכון. קליל בדיוק כשצריך משהו קליל.",
    menu: [
      "סובלאקי עוף בלימון",
      "חלומי צרוב (צמחוני)",
      "פטריות בגריל (טבעוני)",
      "פיתות וצזיקי",
      "סלט יווני",
    ],
    tags: ["vegan-option", "gluten"],
  },
  {
    title: "ערב אסייתי",
    description: "ווק, אש גדולה, וכולם אוכלים מקערה. מהיר אחרי יום ארוך.",
    menu: [
      "אטריות מוקפצות בווק",
      "טופו וירקות (טבעוני)",
      "אורז דביק",
      "אצות ושומשום",
      "צ׳ילי ולימון בצד",
    ],
    tags: ["vegan-option", "spicy"],
  },
  {
    title: "ליל הבלקן",
    description: "בשרים, גריל ולחם. אוכל של אנשים שעבדו כל היום.",
    menu: [
      "קבב וקובידה",
      "קבב עדשים ואגוזים (טבעוני)",
      "אורז עם שקדים",
      "סלט צ׳ופסקה",
      "יוגורט ושום",
    ],
    tags: ["vegan-option", "gluten"],
  },
  {
    title: "ערב חומוס",
    description: "ארוחה שלמה כמעט בלי בישול. מושלמת ליום שכולם מותשים.",
    menu: [
      "חומוס חם עם גרגרים (טבעוני)",
      "פול ומסבחה (טבעוני)",
      "ביצים קשות",
      "פיתות חמות",
      "סלט ערבי וחמוצים",
    ],
    tags: ["vegan-option", "gluten"],
  },
];

/* How many flames each member gets. One per evening the camp will cook, so
   voting reads as "these are my nights" rather than as a budget. */
const NIGHTS_TO_COOK = 5;

async function main() {
  const reset = process.argv.includes("--reset");

  const stale = await db.query.voteRounds.findMany({
    where: inArray(voteRounds.title, SUPERSEDED),
  });
  if (stale.length) {
    await db.delete(voteRounds).where(inArray(voteRounds.title, SUPERSEDED));
    console.log(`removed ${stale.length} rounds from the earlier designs`);
  }

  let round = await db.query.voteRounds.findFirst({
    where: eq(voteRounds.title, ROUND_TITLE),
    with: { options: true },
  });

  if (round && reset) {
    await db.delete(voteRounds).where(eq(voteRounds.id, round.id));
    round = undefined;
    console.log("--reset: rebuilding the round");
  }

  if (!round) {
    const roundId = newId();
    await db.insert(voteRounds).values({
      id: roundId,
      title: ROUND_TITLE,
      subtitle: `יש לכם ${NIGHTS_TO_COOK} להבות — אחת לכל ערב שנבשל. תנו אותן לערבים שאתם הכי רוצים.`,
      mealType: "dinner",
      tokensPerVoter: NIGHTS_TO_COOK,
      maxPerOption: 1,
      status: "upcoming",
    });
    round = await db.query.voteRounds.findFirst({
      where: eq(voteRounds.id, roundId),
      with: { options: true },
    });
    console.log(`created "${ROUND_TITLE}" — ${NIGHTS_TO_COOK} flames, 1 per evening`);
  }

  if (!round) throw new Error("round missing after creation");

  const palette = ["sun", "terracotta", "pink", "lavender", "dust-blue", "peach"];
  const existing = new Set(round.options.map((o) => o.title));
  let added = 0;

  for (const evening of EVENINGS) {
    if (existing.has(evening.title)) continue;
    await db.insert(voteOptions).values({
      id: newId(),
      roundId: round.id,
      title: evening.title,
      description: evening.description,
      dishes: evening.menu.join("\n"),
      tags: evening.tags,
      accent: palette[(round.options.length + added) % palette.length],
      sortOrder: round.options.length + added,
    });
    added++;
  }

  console.log(`${added} evenings added · ${round.options.length + added} on the board`);
  console.log("HQ → הצבעות: check the list, then open it for voting.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
