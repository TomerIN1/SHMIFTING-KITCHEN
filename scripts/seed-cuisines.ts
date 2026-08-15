/* Must be first: it loads .env.local before ../lib/db reads the connection. */
import "./load-env";
import { eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { voteRounds, voteOptions } from "../lib/db/schema";
import { newId } from "../lib/utils";

/* ============================================================================
   THE CUISINE NIGHTS

   Each evening of the burn is one cuisine, and the cuisine is a decision, not
   a vote — the Kitchen Lead sets it. What the camp votes on is the main course
   INSIDE that evening: six candidates per night, and the flames pick one.

   So this builds one round per cuisine, each holding:

     · four mains, the ones people actually picture when they hear the cuisine
     · two vegan mains that are dishes in their own right

   That second point is the one worth defending. The vegan options here are not
   the same plate with the meat left off — falafel, dal, charred aubergine and
   black bean tacos are what a third of the camp would order anyway. Bible §17
   asks for dietary needs to be designed for rather than accommodated, and a
   vegan who wins the vote outright is the proof it worked.

   One flame per round. The ask was "select one out of a few", so voting is six
   quick taps rather than a budgeting exercise.

   Every round is created `upcoming`. The Lead sets the dates, cuts what the
   camp is not doing, and opens the ones they want (Bible §23).

     npx tsx scripts/seed-cuisines.ts            (adds only what is missing)
     npx tsx scripts/seed-cuisines.ts --reset    (rebuilds them all)
   ========================================================================= */

type Diet = "omnivore" | "vegetarian" | "vegan";

interface Night {
  title: string;
  subtitle: string;
  mains: { title: string; note: string; dietary: Diet }[];
}

const NIGHTS: Night[] = [
  {
    title: "הערב הישראלי",
    subtitle: "הערב שבו המדבר מרגיש כמו המטבח של אמא. מה עושים?",
    mains: [
      { title: "שניצלים", note: "מטוגנים במקום · פירה · סלט קצוץ דק · לימון", dietary: "omnivore" },
      { title: "קוסקוס עם ירקות ובשר", note: "סיר אחד גדול · מרק ירקות · חריף בצד", dietary: "omnivore" },
      { title: "מעורב ירושלמי", note: "בפיתות · בצל · טחינה · חמוצים", dietary: "omnivore" },
      { title: "סביח", note: "חצילים מטוגנים · ביצה קשה · עמבה · סלט", dietary: "vegetarian" },
      { title: "פלאפל", note: "מטוגן במקום · פיתות · חמישה סלטים · טחינה", dietary: "vegan" },
      { title: "חומוס חם עם גרגרים", note: "מסולת · פול · שמן זית · פיתות חמות", dietary: "vegan" },
    ],
  },
  {
    title: "ליל הודו",
    subtitle: "סיר אחד שמריח על כל הקמפ שלוש שעות לפני שאוכלים.",
    mains: [
      { title: "בטר צ׳יקן", note: "אורז בסמטי · יוגורט ומלפפון · נאן", dietary: "omnivore" },
      { title: "ביריאני עוף", note: "אורז מתובל בסיר אחד · רייתה · חמוצים", dietary: "omnivore" },
      { title: "קימה מטר", note: "בשר טחון ואפונה · אורז · צ׳אפטי", dietary: "omnivore" },
      { title: "פאלאק פאניר", note: "תרד וגבינה · אורז בסמטי · נאן", dietary: "vegetarian" },
      { title: "דאל טאדקה", note: "עדשים בכמון וכוסברה · אורז · לימון כבוש", dietary: "vegan" },
      { title: "צ׳אנה מסאלה", note: "חומוס ברוטב עגבניות · אורז · צ׳אפטי", dietary: "vegan" },
    ],
  },
  {
    title: "על האש",
    subtitle: "מנגל, עשן, וכולם עומדים מסביב. הכי ישראלי שיש.",
    mains: [
      { title: "פרגיות בשיפודים", note: "פיתות · טחינה · חמוצים · בצל סגול", dietary: "omnivore" },
      { title: "קבב", note: "על הרשת · לאפות · סלט ערבי · עמבה", dietary: "omnivore" },
      { title: "אנטריקוט", note: "נתחים על הגחלים · צ׳ימיצ׳ורי · תפוחי אדמה", dietary: "omnivore" },
      { title: "כנפיים בדבש", note: "צרובות · סלט כרוב · לחם שום", dietary: "omnivore" },
      { title: "חצילים שלמים על הגחלים", note: "טחינה · רימונים · לאפות", dietary: "vegan" },
      { title: "שיפודי טופו וירקות", note: "מרינדה חריפה · אורז · בוטנים", dietary: "vegan" },
    ],
  },
  {
    title: "ערב מקסיקני",
    subtitle: "כל אחד בונה לעצמו. הכי מהיר להאכיל בו את כל הקמפ.",
    mains: [
      { title: "טאקוס בשר טחון", note: "טורטיות · גוואקמולי · סלסה · לימון", dietary: "omnivore" },
      { title: "בוריטו עוף", note: "אורז · שעועית · גבינה · סלסה ורדה", dietary: "omnivore" },
      { title: "פחיטס בקר", note: "פלפלים ובצל על הפלנצ׳ה · טורטיות", dietary: "omnivore" },
      { title: "אנצ׳ילדס גבינה", note: "ברוטב עגבניות · שמנת חמוצה · כוסברה", dietary: "vegetarian" },
      { title: "טאקוס שעועית שחורה ובטטה", note: "בטטה צרובה · גוואקמולי · סלסה", dietary: "vegan" },
      { title: "צ׳ילי סין קרנה", note: "שעועית בסיר אחד · אורז · טורטיה צלויה", dietary: "vegan" },
    ],
  },
  {
    title: "ערב אמריקאי",
    subtitle: "בורגרים, ורוטב שנוזל על הידיים. בלי להתנצל.",
    mains: [
      { title: "המבורגר בקר", note: "על הפלנצ׳ה · לחמניות · בצל מקורמל · צ׳יפס", dietary: "omnivore" },
      { title: "פולד ביף", note: "מתפרק אחרי שעות · קולסלו · לחמניות", dietary: "omnivore" },
      { title: "כנפיים באפלו", note: "חריף · סלרי · רוטב לבן", dietary: "omnivore" },
      { title: "מק אנד צ׳יז", note: "בסיר ענק · פירורים קראנצ׳יים · סלט ירוק", dietary: "vegetarian" },
      { title: "בורגר עדשים וסלק", note: "לחמניות · חמוצים · טחינה חריפה · צ׳יפס", dietary: "vegan" },
      { title: "צ׳ילי שעועית", note: "מתבשל לאט · אורז · בצל ולימון", dietary: "vegan" },
    ],
  },
  {
    title: "ערב תאילנדי",
    subtitle: "חריף, חמצמץ ומרענן — בדיוק כשנמאס מהאבק.",
    mains: [
      { title: "קארי אדום עם עוף", note: "קוקוס · אורז יסמין · בזיליקום תאילנדי", dietary: "omnivore" },
      { title: "פאד תאי עוף", note: "אטריות אורז · בוטנים · לימון · נבטים", dietary: "omnivore" },
      { title: "פאד קרפאו", note: "בשר טחון ובזיליקום חריף · אורז · ביצת עין", dietary: "omnivore" },
      { title: "קארי מסאמן", note: "בקר מתפרק · תפוחי אדמה · בוטנים · אורז", dietary: "omnivore" },
      { title: "קארי ירוק ירקות וטופו", note: "קוקוס · חצילים · אורז יסמין", dietary: "vegan" },
      { title: "פאד תאי טופו", note: "בלי רוטב דגים · בוטנים · לימון · צ׳ילי", dietary: "vegan" },
    ],
  },
];

async function main() {
  const reset = process.argv.includes("--reset");
  const titles = NIGHTS.map((n) => n.title);

  /* The first draft modelled a round as "which cuisine?", which is not what
     this camp is doing — the cuisine is the Lead's call. Clear it out. */
  const stale = await db.query.voteRounds.findMany({
    where: eq(voteRounds.title, "ערב לכל טעם"),
  });
  if (stale.length) {
    await db.delete(voteRounds).where(eq(voteRounds.title, "ערב לכל טעם"));
    console.log("removed the earlier one-round draft (wrong model)");
  }

  if (reset) {
    const existing = await db.query.voteRounds.findMany({
      where: inArray(voteRounds.title, titles),
    });
    if (existing.length) {
      await db.delete(voteRounds).where(inArray(voteRounds.title, titles));
      console.log(`--reset: removed ${existing.length} cuisine rounds`);
    }
  }

  const palette = ["sun", "terracotta", "pink", "lavender", "dust-blue", "peach"];
  let rounds = 0;
  let mains = 0;

  for (const night of NIGHTS) {
    const already = await db.query.voteRounds.findFirst({
      where: eq(voteRounds.title, night.title),
    });
    if (already) {
      console.log(`· ${night.title} — already there, skipping`);
      continue;
    }

    const roundId = newId();
    await db.insert(voteRounds).values({
      id: roundId,
      title: night.title,
      subtitle: night.subtitle,
      mealType: "dinner",
      /* One flame: pick the main you want. */
      tokensPerVoter: 1,
      status: "upcoming",
    });
    rounds++;

    for (const [i, main] of night.mains.entries()) {
      await db.insert(voteOptions).values({
        id: newId(),
        roundId,
        title: main.title,
        dishes: main.note,
        dietary: main.dietary,
        accent: palette[i % palette.length],
        sortOrder: i,
      });
      mains++;
    }

    const vegan = night.mains.filter((m) => m.dietary === "vegan").length;
    console.log(
      `✓ ${night.title} — ${night.mains.length} mains (${vegan} vegan)`,
    );
  }

  console.log(`\n${rounds} nights · ${mains} mains, all upcoming.`);
  console.log("HQ → הצבעות: set the date on each night, then open it.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
