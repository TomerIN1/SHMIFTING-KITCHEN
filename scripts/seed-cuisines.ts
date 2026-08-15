/* Must be first: it loads .env.local before ../lib/db reads the connection. */
import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { voteRounds, voteOptions } from "../lib/db/schema";
import { newId } from "../lib/utils";

/* ============================================================================
   THE CUISINE LIBRARY

   Each evening of the burn is one cuisine, chosen rather than improvised. This
   builds the menu the camp votes from: one main course per idea, each with a
   note on what comes alongside it, because the vote is on the centrepiece and
   the Kitchen Lead fills in the rest.

   Written for THIS camp, not for a restaurant:

   · Israeli comfort first. The camp asked to feel at home in the middle of the
     desert, so schnitzel is on the board and so is the food people actually
     grew up eating.
   · Cookable on gas burners in dust. One-pot stews, grills, and things that
     hold. Nothing that needs an oven at scale or a fryer running for an hour —
     except the schnitzel night, which is worth the trouble precisely because
     it is trouble.
   · Every idea carries a vegan or vegetarian route in the same pot where it
     can. Bible §17: dietary needs are designed for, not bolted on afterwards
     as a sad plate to one side.

   Deliberately created as `upcoming`, not `open`. This is a draft for the
   Kitchen Lead to cut, rename and re-price before the camp sees it — the Lead
   owns the menu (Bible §23).

     npx tsx scripts/seed-cuisines.ts            (adds only what is missing)
     npx tsx scripts/seed-cuisines.ts --reset    (wipes the round and rebuilds)
   ========================================================================= */

const ROUND_TITLE = "ערב לכל טעם";

const IDEAS: {
  title: string;
  description: string;
  dishes: string;
  dietaryNote: string;
}[] = [
  {
    title: "ליל השניצל",
    description:
      "הערב שכולם מחכים לו בלי להודות. פירורים, מחבת, ותור שנוצר מעצמו.",
    dishes:
      "שניצלים מטוגנים במקום · פירה חמאתי · סלט ישראלי קצוץ דק · לימון",
    dietaryNote: "גרסת כרובית וסלרי לטבעונים, מאותה מחבת",
  },
  {
    title: "ליל הודו",
    description: "סיר אחד גדול שמריח על כל הקמפ שלוש שעות לפני שאוכלים.",
    dishes: "קארי חומוס ובטטה בקוקוס · אורז בסמטי · יוגורט ומלפפון · צ׳אפטי",
    dietaryNote: "טבעוני במקור — היוגורט בצד",
  },
  {
    title: "על האש",
    description: "הדבר הכי ישראלי שיש. מנגל, עשן, וכולם עומדים מסביב.",
    dishes: "פרגיות ולבבות בשיפודים · חצילים שרופים · פיתות · חמוצים וטחינה",
    dietaryNote: "שיפודי פטריות וטופו על אותה רשת",
  },
  {
    title: "ערב מקסיקני",
    description: "כל אחד בונה לעצמו. הכי מהיר להאכיל בו ארבעים איש.",
    dishes: "טאקוס עם שעועית שחורה ובשר טחון · טורטיות · גוואקמולי · סלסה חריפה",
    dietaryNote: "השעועית היא המנה, לא התחליף",
  },
  {
    title: "ערב אמריקאי",
    description: "בורגרים, ורוטב שנוזל על הידיים. בלי להתנצל.",
    dishes: "המבורגרים על הפלנצ׳ה · לחמניות · בצל מקורמל · צ׳יפס בתנור",
    dietaryNote: "קציצות עדשים ופטריות בגריל",
  },
  {
    title: "ערב תאילנדי",
    description: "חריף, חמצמץ, ומרענן בדיוק כשכבר נמאס לכם מאבק.",
    dishes: "קארי ירוק בקוקוס · אטריות אורז · בוטנים ולימון · סלט כרוב חריף",
    dietaryNote: "טבעוני לגמרי, בלי רוטב דגים",
  },
  {
    title: "ערב איטלקי",
    description: "פסטה לארבעים איש. הדבר הכי מנחם שאפשר לעשות בסיר אחד.",
    dishes: "פסטה ברוטב עגבניות ובזיליקום · פרמזן · לחם שום · סלט ירוק",
    dietaryNote: "הרוטב טבעוני, הגבינה בצד",
  },
  {
    title: "ערב מרוקאי",
    description: "טאג׳ין שמתבשל לאט בזמן שהשמש יורדת. ריח שעוצר אנשים.",
    dishes: "טאג׳ין ירקות ושזיפים · קוסקוס · מרק חריימה · סלטים כבושים",
    dietaryNote: "הטאג׳ין טבעוני, החריימה בצד",
  },
  {
    title: "ליל הבלקן",
    description: "בשרים, גריל ולחם. אוכל של אנשים שעבדו כל היום.",
    dishes: "קבב וקובידה · אורז עם שקדים · סלט צ׳ופסקה · יוגורט ושום",
    dietaryNote: "קבב עדשים ואגוזים על הגריל",
  },
  {
    title: "ערב אסייתי",
    description: "ווק, אש גדולה, וכולם אוכלים מקערה. הכי מהיר אחרי יום ארוך.",
    dishes: "אטריות מוקפצות בווק · טופו וירקות · אורז דביק · אצות ושומשום",
    dietaryNote: "טבעוני כברירת מחדל",
  },
  {
    title: "ערב יווני",
    description: "לימון, אורגנו וים תיכון. קליל בדיוק כשצריך משהו קליל.",
    dishes: "סובלאקי עוף בלימון · פיתות · צזיקי · סלט יווני עם פטה",
    dietaryNote: "סובלאקי חלומי לצמחונים, פטריות לטבעונים",
  },
  {
    title: "ערב חומוס",
    description: "ארוחה שלמה בלי בישול אמיתי. מושלמת ליום שכולם מותשים.",
    dishes: "חומוס חם עם גרגרים · פול · ביצים קשות · פיתות · סלט ערבי",
    dietaryNote: "טבעוני כמעט לגמרי — הביצה בצד",
  },
];

async function main() {
  const reset = process.argv.includes("--reset");

  let round = await db.query.voteRounds.findFirst({
    where: eq(voteRounds.title, ROUND_TITLE),
    with: { options: true },
  });

  if (round && reset) {
    await db.delete(voteRounds).where(eq(voteRounds.id, round.id));
    console.log("removed the previous draft round");
    round = undefined;
  }

  if (!round) {
    const roundId = newId();
    await db.insert(voteRounds).values({
      id: roundId,
      title: ROUND_TITLE,
      subtitle: "כל ערב בבורן הוא מטבח אחר. תנו אש למה שאתם רוצים לאכול.",
      /* No mealDate on the round: each idea carries its own evening, because
         a round here is a menu of nights, not one night. */
      mealType: "dinner",
      tokensPerVoter: 5,
      status: "upcoming",
    });
    round = await db.query.voteRounds.findFirst({
      where: eq(voteRounds.id, roundId),
      with: { options: true },
    });
    console.log(`created round "${ROUND_TITLE}" (upcoming — open it from HQ)`);
  }

  if (!round) throw new Error("round missing after creation");

  const palette = ["sun", "terracotta", "pink", "lavender", "dust-blue", "peach"];
  const existing = new Set(round.options.map((o) => o.title));
  let added = 0;

  for (const idea of IDEAS) {
    if (existing.has(idea.title)) continue;
    await db.insert(voteOptions).values({
      id: newId(),
      roundId: round.id,
      title: idea.title,
      description: idea.description,
      dishes: idea.dishes,
      dietaryNote: idea.dietaryNote,
      accent: palette[(round.options.length + added) % palette.length],
      sortOrder: round.options.length + added,
    });
    added++;
  }

  console.log(
    `${added} ideas added · ${round.options.length + added} on the board`,
  );
  console.log("open it for voting from HQ → הצבעות when the list looks right.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
