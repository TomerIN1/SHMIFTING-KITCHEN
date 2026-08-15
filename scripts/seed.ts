import "dotenv/config";
import bcrypt from "bcryptjs";
import { assertLocalDatabase } from "./guard-remote";
import { db } from "../lib/db";
import * as s from "../lib/db/schema";

assertLocalDatabase("seed a demo camp");

/* ============================================================================
   SEED — a believable Camp Shmifting, mid-planning.

   The point is not to make the product look finished. It is to make it look
   HALF finished, because that is the state a Kitchen Lead actually works in:
   some profiles missing, one allergy unreviewed, a shift short two people, a
   meal still proposed. Every screen in this product exists to surface exactly
   those gaps (Bible §24, §30, §36), and a perfect seed would hide all of them.

     npm run db:seed        # wipes and reseeds
   ========================================================================= */

const DAY = 86_400_000;
const today = new Date();
today.setHours(12, 0, 0, 0);

/* Bible §38: real dates are the Kitchen Lead's to set in HQ → Settings.
   Seeded 83 days out so the countdown reads like the Bible's own example. */
const departure = new Date(today.getTime() + 83 * DAY);
const festivalStart = new Date(departure.getTime() + DAY);
const day = (n: number) => new Date(festivalStart.getTime() + n * DAY);

const id = () => crypto.randomUUID();
const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length];

async function wipe() {
  /* Order matters — children before parents. */
  await db.delete(s.shoppingItems);
  await db.delete(s.shiftAssignments);
  await db.delete(s.shifts);
  await db.delete(s.recipeItems);
  await db.delete(s.recipes);
  await db.delete(s.dishes);
  await db.delete(s.meals);
  await db.delete(s.votes);
  await db.delete(s.voteOptions);
  await db.delete(s.voteRounds);
  await db.delete(s.ingredients);
  await db.delete(s.allergies);
  await db.delete(s.foodProfiles);
  await db.delete(s.users);
  await db.delete(s.settings);
}

/* ------------------------------------------------------------------------- */

const PEOPLE: {
  name: string;
  email: string;
  role?: "admin" | "shmifter";
  pattern?: "omnivore" | "vegetarian" | "vegan";
  spice?: number;
  restrictions?: string[];
  dislikes?: string[];
  wish?: string;
  /* undefined = profile never filled in */
  complete?: boolean;
  allergies?: {
    allergen: string;
    severity: "avoid" | "severe" | "anaphylaxis";
    details?: string;
    reviewed?: boolean;
  }[];
}[] = [
  {
    name: "תומר",
    email: "tomer@shmifting.camp",
    role: "admin",
    pattern: "omnivore",
    spice: 3,
    complete: true,
    wish: "משהו שמתבשל שעות ומריח על כל הקמפ",
  },
  {
    name: "נועה",
    email: "noa@shmifting.camp",
    pattern: "vegetarian",
    spice: 2,
    complete: true,
    restrictions: ["lactose_free"],
    wish: "לחם טרי. סתם לחם טרי.",
    allergies: [
      {
        allergen: "sesame",
        severity: "severe",
        details: "טחינה, חלבה, כל דבר עם שומשום. מגיבה גם לעקבות.",
        reviewed: true,
      },
    ],
  },
  {
    name: "יונתן",
    email: "yonatan@shmifting.camp",
    pattern: "omnivore",
    spice: 4,
    complete: true,
    dislikes: ["חציל", "זיתים"],
    wish: "משהו חריף מספיק כדי להעיר אותי",
  },
  {
    name: "שירה",
    email: "shira@shmifting.camp",
    pattern: "vegan",
    spice: 2,
    complete: true,
    wish: "קפה טוב בבוקר, זה הכל",
  },
  {
    name: "עידו",
    email: "ido@shmifting.camp",
    pattern: "omnivore",
    spice: 1,
    complete: true,
    allergies: [
      {
        allergen: "peanuts",
        severity: "anaphylaxis",
        details:
          "אלרגיה קשה. יש לי אפיפן בתיק ובקופסה הכחולה במטבח. גם עקבות מסוכנות.",
        reviewed: true,
      },
    ],
  },
  {
    name: "מאיה",
    email: "maya@shmifting.camp",
    pattern: "vegetarian",
    spice: 3,
    complete: true,
    restrictions: ["gluten_free"],
    wish: "סלט שהוא לא רק עגבנייה ומלפפון",
  },
  {
    name: "אורי",
    email: "uri@shmifting.camp",
    pattern: "omnivore",
    spice: 2,
    complete: true,
    dislikes: ["כוסברה"],
  },
  {
    name: "תמר",
    email: "tamar@shmifting.camp",
    pattern: "vegan",
    spice: 3,
    complete: true,
    wish: "חומוס. הרבה חומוס.",
  },
  {
    name: "רועי",
    email: "roi@shmifting.camp",
    pattern: "omnivore",
    spice: 2,
    complete: true,
    allergies: [
      {
        allergen: "dairy",
        severity: "avoid",
        details: "לא קטלני, אבל יום שלם על הפנים.",
        /* Deliberately unreviewed — the Allergy Center must have something
           real to be for. */
        reviewed: false,
      },
    ],
  },
  {
    name: "ליאור",
    email: "lior@shmifting.camp",
    pattern: "vegetarian",
    spice: 1,
    complete: true,
    dislikes: ["פטריות"],
  },
  {
    name: "דנה",
    email: "dana@shmifting.camp",
    pattern: "omnivore",
    spice: 4,
    complete: true,
    wish: "משהו מתוק אחרי ארוחת ערב",
  },
  {
    name: "אסף",
    email: "asaf@shmifting.camp",
    pattern: "omnivore",
    spice: 2,
    complete: true,
  },
  {
    name: "יעל",
    email: "yael@shmifting.camp",
    pattern: "vegan",
    spice: 2,
    complete: true,
    restrictions: ["gluten_free"],
    wish: "שמישהו יזכור שטבעוני זה לא רק סלט",
  },
  {
    name: "גיא",
    email: "guy@shmifting.camp",
    pattern: "omnivore",
    spice: 3,
    complete: true,
  },
  {
    name: "אביגיל",
    email: "avigail@shmifting.camp",
    pattern: "vegetarian",
    spice: 2,
    complete: true,
    allergies: [
      {
        allergen: "tree_nuts",
        severity: "severe",
        details: "אגוזי מלך ופקאן במיוחד. שקדים בסדר.",
        reviewed: false,
      },
    ],
  },
  {
    name: "עומר",
    email: "omer@shmifting.camp",
    pattern: "omnivore",
    spice: 2,
    complete: true,
    dislikes: ["דגים"],
  },
  { name: "הילה", email: "hila@shmifting.camp", pattern: "omnivore", spice: 3, complete: true },
  { name: "ניר", email: "nir@shmifting.camp", pattern: "omnivore", spice: 2, complete: true },
  {
    name: "רותם",
    email: "rotem@shmifting.camp",
    pattern: "vegetarian",
    spice: 2,
    complete: true,
    wish: "שקשוקה בשעה לא הגיונית",
  },
  { name: "אלון", email: "alon@shmifting.camp", pattern: "omnivore", spice: 4, complete: true },

  /* Four people who have not filled anything in. This is the number the
     Kitchen HQ Overview is supposed to shout about. */
  { name: "מיכל", email: "michal@shmifting.camp" },
  { name: "איתי", email: "itay@shmifting.camp" },
  { name: "שני", email: "shani@shmifting.camp" },
  { name: "בר", email: "bar@shmifting.camp" },
];

const INGREDIENTS: {
  name: string;
  category: string;
  unit: string;
  cost: number;
  allergens?: string[];
}[] = [
  { name: "עגבניות", category: "produce", unit: "kg", cost: 8 },
  { name: "בצל", category: "produce", unit: "kg", cost: 5 },
  { name: "שום", category: "produce", unit: "kg", cost: 22 },
  { name: "פלפל אדום", category: "produce", unit: "kg", cost: 12 },
  { name: "בטטה", category: "produce", unit: "kg", cost: 9 },
  { name: "תפוח אדמה", category: "produce", unit: "kg", cost: 6 },
  { name: "גזר", category: "produce", unit: "kg", cost: 6 },
  { name: "מלפפון", category: "produce", unit: "kg", cost: 8 },
  { name: "לימון", category: "produce", unit: "kg", cost: 10 },
  { name: "כוסברה", category: "produce", unit: "bunch", cost: 4 },
  { name: "פטרוזיליה", category: "produce", unit: "bunch", cost: 4 },
  { name: "חסה", category: "produce", unit: "unit", cost: 7 },
  { name: "אבוקדו", category: "produce", unit: "unit", cost: 6 },
  { name: "ליים", category: "produce", unit: "kg", cost: 14 },
  { name: "בזיליקום", category: "produce", unit: "bunch", cost: 5 },
  { name: "חלב קוקוס", category: "dry", unit: "can", cost: 9 },
  { name: "עדשים כתומות", category: "dry", unit: "kg", cost: 14, allergens: ["legumes"] },
  { name: "גרגרי חומוס יבשים", category: "dry", unit: "kg", cost: 12, allergens: ["legumes"] },
  { name: "אורז בסמטי", category: "dry", unit: "kg", cost: 11 },
  { name: "פסטה פנה", category: "dry", unit: "kg", cost: 9, allergens: ["gluten"] },
  { name: "שעועית שחורה", category: "dry", unit: "can", cost: 7, allergens: ["legumes"] },
  { name: "רסק עגבניות", category: "dry", unit: "can", cost: 5 },
  { name: "שמן זית", category: "dry", unit: "l", cost: 38 },
  { name: "טחינה גולמית", category: "dry", unit: "kg", cost: 26, allergens: ["sesame"] },
  { name: "טורטיות", category: "bakery", unit: "package", cost: 14, allergens: ["gluten"] },
  { name: "לחם כפרי", category: "bakery", unit: "unit", cost: 16, allergens: ["gluten"] },
  { name: "פיתות", category: "bakery", unit: "package", cost: 12, allergens: ["gluten"] },
  { name: "ביצים", category: "refrigerated", unit: "tray", cost: 32, allergens: ["eggs"] },
  { name: "גבינה צהובה", category: "refrigerated", unit: "kg", cost: 45, allergens: ["dairy"] },
  { name: "לבנה", category: "refrigerated", unit: "kg", cost: 28, allergens: ["dairy"] },
  { name: "שמנת צמחית", category: "refrigerated", unit: "l", cost: 18, allergens: ["soy"] },
  { name: "טופו", category: "refrigerated", unit: "kg", cost: 30, allergens: ["soy"] },
  { name: "כמון", category: "spices", unit: "g", cost: 0.09 },
  { name: "פפריקה מתוקה", category: "spices", unit: "g", cost: 0.07 },
  { name: "כורכום", category: "spices", unit: "g", cost: 0.1 },
  { name: "גראם מסאלה", category: "spices", unit: "g", cost: 0.14 },
  { name: "צ׳ילי גרוס", category: "spices", unit: "g", cost: 0.12 },
  { name: "מלח גס", category: "spices", unit: "kg", cost: 6 },
  { name: "קפה טחון", category: "drinks", unit: "kg", cost: 90 },
  { name: "תה נענע", category: "drinks", unit: "package", cost: 12 },
  { name: "מים מינרלים", category: "drinks", unit: "bottle", cost: 7 },
];

async function seed() {
  console.log("SHMIFTING — seeding a camp mid-planning…\n");
  await wipe();

  /* --- settings --------------------------------------------------------- */
  await db.insert(s.settings).values({
    id: "camp",
    campName: "שמיפטינג",
    inviteCode: "SHMIFT",
    departureDate: departure,
    festivalStart,
    festivalEnd: day(4),
    expectedDiners: PEOPLE.length,
    budgetPerPerson: 260,
    currency: "₪",
    shiftsOpenAt: new Date(today.getTime() - 7 * DAY),
    shiftsPerPerson: 2,
    menuRevealedAt: null,
    budgetReviewedAt: null,
  });

  /* --- people ----------------------------------------------------------- */
  const hash = await bcrypt.hash("shmifting", 10);
  const userIds: string[] = [];

  for (const person of PEOPLE) {
    const uid = id();
    userIds.push(uid);

    await db.insert(s.users).values({
      id: uid,
      email: person.email,
      name: person.name,
      passwordHash: hash,
      role: person.role ?? "shmifter",
    });

    await db.insert(s.foodProfiles).values({
      id: id(),
      userId: uid,
      dietaryPattern: person.pattern ?? "omnivore",
      spiceLevel: person.spice ?? 2,
      restrictions: person.restrictions ?? [],
      dislikes: person.dislikes ?? [],
      wish: person.wish ?? null,
      completedAt: person.complete ? new Date(today.getTime() - 10 * DAY) : null,
    });

    for (const allergy of person.allergies ?? []) {
      await db.insert(s.allergies).values({
        id: id(),
        userId: uid,
        allergen: allergy.allergen,
        details: allergy.details ?? null,
        severity: allergy.severity,
        reviewedAt: allergy.reviewed ? new Date(today.getTime() - 5 * DAY) : null,
        reviewedBy: allergy.reviewed ? userIds[0] : null,
        reviewNote: allergy.reviewed ? "נבדק. מסומן בכל המנות הרלוונטיות." : null,
      });
    }
  }
  console.log(`· ${PEOPLE.length} people (4 without a profile, on purpose)`);

  /* --- ingredients ------------------------------------------------------ */
  const ing = new Map<string, string>();
  for (const item of INGREDIENTS) {
    const iid = id();
    ing.set(item.name, iid);
    await db.insert(s.ingredients).values({
      id: iid,
      name: item.name,
      category: item.category,
      defaultUnit: item.unit,
      estimatedUnitCost: item.cost,
      allergens: item.allergens ?? [],
    });
  }
  console.log(`· ${INGREDIENTS.length} ingredients`);

  /* --- voting ----------------------------------------------------------- */
  const closedRound = id();
  await db.insert(s.voteRounds).values({
    id: closedRound,
    title: "THE GREAT MENU VOTE",
    subtitle: "ארוחת הערב של ליל שישי. אחת. תבחרו טוב.",
    mealDate: day(1),
    mealType: "dinner",
    tokensPerVoter: 3,
    status: "closed",
    closesAt: new Date(today.getTime() - 3 * DAY),
  });

  const concepts = [
    {
      title: "ליל הודו",
      description: "קארי עדשים שמתבשל מהצהריים, אורז בסמטי, ולחם שנאפה על האש.",
      dishes: "קארי עדשים ובטטה\nאורז בסמטי\nסלט קצוץ עם ליים",
      dietaryNote: "טבעוני במקור. אפשר להוסיף יוגורט בצד.",
      accent: "sun",
    },
    {
      title: "ליל מקסיקו",
      description: "טאקוס שכל אחד מרכיב לעצמו, שעועית שחורה, וגוואקמולה בכמויות.",
      dishes: "טאקוס שעועית שחורה\nגוואקמולה\nסלסה טרייה",
      dietaryNote: "טבעוני. הגבינה בצד למי שרוצה.",
      accent: "terracotta",
    },
    {
      title: "ליל איטליה",
      description: "פסטה ענקית לכל הקמפ, רוטב עגבניות שהתבשל שעתיים, ולחם שום.",
      dishes: "פנה ברוטב עגבניות\nלחם שום\nסלט ירוק",
      dietaryNote: "צמחוני. יש גלוטן.",
      accent: "pink",
    },
  ];

  const conceptIds: string[] = [];
  for (const [i, concept] of concepts.entries()) {
    const oid = id();
    conceptIds.push(oid);
    await db.insert(s.voteOptions).values({
      id: oid,
      roundId: closedRound,
      title: concept.title,
      description: concept.description,
      dishes: concept.dishes,
      dietaryNote: concept.dietaryNote,
      accent: concept.accent,
      sortOrder: i,
    });
  }

  /* Flame distributions that look like real people voting: mostly lopsided,
     a few spread evenly, four people who never voted at all. */
  const SPREADS = [
    [3, 0, 0], [2, 1, 0], [1, 1, 1], [3, 0, 0], [2, 0, 1],
    [0, 3, 0], [1, 2, 0], [2, 1, 0], [0, 2, 1], [3, 0, 0],
    [1, 0, 2], [2, 1, 0], [0, 1, 2], [3, 0, 0], [1, 1, 1],
    [2, 0, 1], [0, 3, 0], [2, 1, 0], [1, 2, 0], [3, 0, 0],
  ];
  for (const [i, uid] of userIds.slice(0, SPREADS.length).entries()) {
    const spread = pick(SPREADS, i);
    for (const [j, flames] of spread.entries()) {
      if (flames === 0) continue;
      await db.insert(s.votes).values({
        id: id(),
        roundId: closedRound,
        optionId: conceptIds[j],
        userId: uid,
        flames,
      });
    }
  }

  /* An open round, so the member experience has something live to do. */
  const openRound = id();
  await db.insert(s.voteRounds).values({
    id: openRound,
    title: "ארוחת הבוקר של שבת",
    subtitle: "היום היחיד שבו יש זמן לבשל בוקר כמו שצריך.",
    mealDate: day(2),
    mealType: "breakfast",
    tokensPerVoter: 3,
    status: "open",
    closesAt: new Date(today.getTime() + 9 * DAY),
  });

  const morningConcepts = [
    {
      title: "שקשוקה ענקית",
      description: "מחבת אחת רצינית, לחם טרי, וכולם מסביב.",
      dishes: "שקשוקה\nלחם כפרי\nסלט ירקות",
      accent: "terracotta",
    },
    {
      title: "בוקר מפנק",
      description: "פנקייקים, פירות, וסירופ. פשוט וגלוי.",
      dishes: "פנקייקים\nפירות העונה\nלבנה בצד",
      accent: "lavender",
    },
    {
      title: "בוקר מדברי",
      description: "לביבות בטטה, טחינה, סלט, וקפה שנעשה על האש.",
      dishes: "לביבות בטטה\nטחינה\nסלט קצוץ",
      accent: "dust-blue",
    },
  ];
  const morningIds: string[] = [];
  for (const [i, concept] of morningConcepts.entries()) {
    const oid = id();
    morningIds.push(oid);
    await db.insert(s.voteOptions).values({
      id: oid,
      roundId: openRound,
      title: concept.title,
      description: concept.description,
      dishes: concept.dishes,
      accent: concept.accent,
      sortOrder: i,
    });
  }
  /* Only about half the camp has voted yet — the round is still open. */
  for (const [i, uid] of userIds.slice(0, 11).entries()) {
    const spread = pick([[2, 1, 0], [3, 0, 0], [0, 1, 2], [1, 1, 1]], i);
    for (const [j, flames] of spread.entries()) {
      if (flames === 0) continue;
      await db.insert(s.votes).values({
        id: id(),
        roundId: openRound,
        optionId: morningIds[j],
        userId: uid,
        flames,
      });
    }
  }
  console.log("· 2 vote rounds (1 closed, 1 open)");

  /* --- the menu --------------------------------------------------------- */
  type DishSeed = {
    name: string;
    role: "main" | "side" | "salad" | "sauce" | "bread" | "dessert" | "drink";
    dietary: "omnivore" | "vegetarian" | "vegan";
    allergens?: string[];
    recipe?: {
      name: string;
      base: number;
      instructions: string;
      items: [string, number, string][];
    };
  };

  const MENU: {
    date: Date;
    type: "breakfast" | "lunch" | "dinner";
    title: string;
    concept?: string;
    status: "proposed" | "review" | "final";
    sourceRound?: string;
    dishes: DishSeed[];
  }[] = [
    {
      date: day(0),
      type: "dinner",
      title: "ערב הגעה",
      concept: "מרק, לחם, ולא להתאמץ. כולם עייפים מהנסיעה.",
      status: "final",
      dishes: [
        {
          name: "מרק עדשים",
          role: "main",
          dietary: "vegan",
          recipe: {
            name: "מרק עדשים כתומות",
            base: 8,
            instructions:
              "מטגנים בצל, גזר ושום בשמן זית עד שהבצל שקוף.\nמוסיפים כמון וכורכום, מערבבים חצי דקה.\nמוסיפים עדשים ומים, מבשלים 25 דקות.\nמתקנים מלח, סוחטים לימון בסוף.",
            items: [
              ["עדשים כתומות", 0.6, "kg"],
              ["בצל", 0.4, "kg"],
              ["גזר", 0.3, "kg"],
              ["שום", 0.04, "kg"],
              ["כמון", 12, "g"],
              ["כורכום", 8, "g"],
              ["שמן זית", 0.08, "l"],
              ["לימון", 0.15, "kg"],
            ],
          },
        },
        {
          name: "לחם כפרי",
          role: "bread",
          dietary: "vegan",
          allergens: ["gluten"],
          recipe: {
            name: "לחם לארוחה",
            base: 8,
            instructions: "לחמם על הגריל דקה מכל צד לפני ההגשה.",
            items: [["לחם כפרי", 1.5, "unit"]],
          },
        },
        {
          name: "סלט קצוץ",
          role: "salad",
          dietary: "vegan",
          recipe: {
            name: "סלט קצוץ קלאסי",
            base: 8,
            instructions: "קוצצים דק. מתבלים רק לפני ההגשה, אחרת זה נהיה מים.",
            items: [
              ["עגבניות", 0.8, "kg"],
              ["מלפפון", 0.7, "kg"],
              ["בצל", 0.15, "kg"],
              ["פטרוזיליה", 1, "bunch"],
              ["לימון", 0.1, "kg"],
              ["שמן זית", 0.05, "l"],
            ],
          },
        },
      ],
    },
    {
      date: day(1),
      type: "breakfast",
      title: "בוקר ראשון",
      status: "final",
      dishes: [
        {
          name: "שקשוקה",
          role: "main",
          dietary: "vegetarian",
          allergens: ["eggs"],
          recipe: {
            name: "שקשוקה למחבת גדולה",
            base: 6,
            instructions:
              "מטגנים בצל ופלפל עד ריכוך.\nמוסיפים עגבניות ורסק, מבשלים 20 דקות עד שהרוטב סמיך.\nפותחים גומות ושוברים ביצים.\nמכסים 6 דקות.",
            items: [
              ["עגבניות", 1.2, "kg"],
              ["פלפל אדום", 0.5, "kg"],
              ["בצל", 0.3, "kg"],
              ["שום", 0.03, "kg"],
              ["רסק עגבניות", 1, "can"],
              ["ביצים", 1, "tray"],
              ["פפריקה מתוקה", 15, "g"],
              ["כמון", 8, "g"],
              ["שמן זית", 0.06, "l"],
            ],
          },
        },
        {
          name: "טופו מוקפץ",
          role: "main",
          dietary: "vegan",
          allergens: ["soy"],
          recipe: {
            name: "טופו מתובל למי שלא אוכל ביצים",
            base: 6,
            instructions:
              "מפוררים טופו למחבת חמה.\nמתבלים בכורכום ופפריקה — זה מה שנותן את הצבע.\nמוקפצים 6 דקות.",
            items: [
              ["טופו", 0.5, "kg"],
              ["כורכום", 6, "g"],
              ["פפריקה מתוקה", 8, "g"],
              ["בצל", 0.2, "kg"],
              ["שמן זית", 0.04, "l"],
            ],
          },
        },
        { name: "פיתות", role: "bread", dietary: "vegan", allergens: ["gluten"] },
        { name: "קפה", role: "drink", dietary: "vegan" },
      ],
    },
    {
      date: day(1),
      type: "lunch",
      title: "צהריים קלים",
      concept: "חם מדי לבשל. הכול קר, הכול מוכן מראש.",
      status: "final",
      dishes: [
        {
          name: "חומוס ביתי",
          role: "main",
          dietary: "vegan",
          allergens: ["sesame", "legumes"],
          recipe: {
            name: "חומוס לקמפ",
            base: 10,
            instructions:
              "משרים גרגרים לילה שלם. זה לא אופציונלי.\nמבשלים עם סודה לשתייה עד שהם נמעכים באצבע.\nטוחנים חם עם טחינה, לימון ושום.",
            items: [
              ["גרגרי חומוס יבשים", 0.7, "kg"],
              ["טחינה גולמית", 0.35, "kg"],
              ["לימון", 0.2, "kg"],
              ["שום", 0.03, "kg"],
              ["שמן זית", 0.08, "l"],
            ],
          },
        },
        { name: "סלט ירוק", role: "salad", dietary: "vegan" },
        { name: "פיתות", role: "bread", dietary: "vegan", allergens: ["gluten"] },
      ],
    },
    {
      date: day(1),
      type: "dinner",
      title: "ליל הודו",
      concept: "מה שהקמפ בחר. קארי שמתבשל מהצהריים.",
      status: "final",
      sourceRound: closedRound,
      dishes: [
        {
          name: "קארי עדשים ובטטה",
          role: "main",
          dietary: "vegan",
          recipe: {
            name: "קארי עדשים ובטטה",
            base: 8,
            instructions:
              "מטגנים בצל, שום וצ׳ילי עד זהוב.\nמוסיפים גראם מסאלה וכורכום, מערבבים 30 שניות — זה הרגע שהריח משתחרר.\nמוסיפים בטטה בקוביות, עדשים, חלב קוקוס ומים.\nמבשלים על אש נמוכה 40 דקות.\nמסיימים בכוסברה קצוצה וליים.",
            items: [
              ["עדשים כתומות", 0.8, "kg"],
              ["בטטה", 1.2, "kg"],
              ["חלב קוקוס", 3, "can"],
              ["בצל", 0.5, "kg"],
              ["שום", 0.05, "kg"],
              ["גראם מסאלה", 25, "g"],
              ["כורכום", 10, "g"],
              ["צ׳ילי גרוס", 6, "g"],
              ["כוסברה", 2, "bunch"],
              ["ליים", 0.2, "kg"],
              ["שמן זית", 0.08, "l"],
            ],
          },
        },
        {
          name: "אורז בסמטי",
          role: "side",
          dietary: "vegan",
          recipe: {
            name: "אורז בסמטי לקמפ",
            base: 8,
            instructions:
              "שוטפים את האורז עד שהמים צלולים.\nיחס 1:1.5 מים.\nמביאים לרתיחה, מנמיכים, מכסים 12 דקות, ולא פותחים.",
            items: [
              ["אורז בסמטי", 0.9, "kg"],
              ["מלח גס", 0.02, "kg"],
            ],
          },
        },
        {
          name: "סלט קצוץ עם ליים",
          role: "salad",
          dietary: "vegan",
          recipe: {
            name: "סלט קצוץ עם ליים וכוסברה",
            base: 8,
            instructions: "קוצצים דק, מתבלים בליים במקום לימון. הבדל קטן, שינוי גדול.",
            items: [
              ["עגבניות", 0.7, "kg"],
              ["מלפפון", 0.6, "kg"],
              ["בצל", 0.15, "kg"],
              ["כוסברה", 1, "bunch"],
              ["ליים", 0.15, "kg"],
            ],
          },
        },
      ],
    },
    {
      date: day(2),
      type: "breakfast",
      title: "בוקר שבת",
      concept: "מחכה לתוצאות ההצבעה.",
      status: "proposed",
      sourceRound: openRound,
      dishes: [],
    },
    {
      date: day(2),
      type: "dinner",
      title: "ליל מקסיקו",
      concept: "טאקוס שכל אחד מרכיב לעצמו.",
      status: "review",
      dishes: [
        {
          name: "טאקוס שעועית שחורה",
          role: "main",
          dietary: "vegan",
          allergens: ["gluten"],
          recipe: {
            name: "מילוי שעועית שחורה",
            base: 8,
            instructions:
              "מטגנים בצל ושום.\nמוסיפים שעועית מסוננת, כמון ופפריקה.\nמועכים חלק מהשעועית כדי לקבל מרקם.",
            items: [
              ["שעועית שחורה", 5, "can"],
              ["בצל", 0.4, "kg"],
              ["שום", 0.03, "kg"],
              ["כמון", 15, "g"],
              ["פפריקה מתוקה", 10, "g"],
              ["טורטיות", 3, "package"],
            ],
          },
        },
        {
          name: "גוואקמולה",
          role: "sauce",
          dietary: "vegan",
          recipe: {
            name: "גוואקמולה",
            base: 8,
            instructions: "מועכים במזלג, לא בבלנדר. מוסיפים ליים מיד כדי שלא ישחיר.",
            items: [
              ["אבוקדו", 6, "unit"],
              ["ליים", 0.2, "kg"],
              ["בצל", 0.1, "kg"],
              ["כוסברה", 1, "bunch"],
            ],
          },
        },
        { name: "גבינה מגוררת", role: "side", dietary: "vegetarian", allergens: ["dairy"] },
      ],
    },
    {
      date: day(3),
      type: "dinner",
      title: "ליל איטליה",
      concept: "פסטה אחת ענקית לכל הקמפ.",
      status: "proposed",
      dishes: [
        { name: "פנה ברוטב עגבניות", role: "main", dietary: "vegetarian", allergens: ["gluten"] },
        { name: "לחם שום", role: "bread", dietary: "vegetarian", allergens: ["gluten", "dairy"] },
      ],
    },
  ];

  let dishCount = 0;
  let recipeCount = 0;

  for (const meal of MENU) {
    const mid = id();
    await db.insert(s.meals).values({
      id: mid,
      date: meal.date,
      mealType: meal.type,
      title: meal.title,
      concept: meal.concept ?? null,
      status: meal.status,
      sourceRoundId: meal.sourceRound ?? null,
    });

    for (const [i, dish] of meal.dishes.entries()) {
      const did = id();
      dishCount++;
      await db.insert(s.dishes).values({
        id: did,
        mealId: mid,
        name: dish.name,
        role: dish.role,
        dietary: dish.dietary,
        allergens: dish.allergens ?? [],
        sortOrder: i,
      });

      if (!dish.recipe) continue;
      recipeCount++;
      const rid = id();
      await db.insert(s.recipes).values({
        id: rid,
        dishId: did,
        name: dish.recipe.name,
        baseServings: dish.recipe.base,
        instructions: dish.recipe.instructions,
        isFinal: meal.status === "final",
      });

      for (const [j, [name, qty, unit]] of dish.recipe.items.entries()) {
        const iid = ing.get(name);
        if (!iid) throw new Error(`unknown ingredient in seed: ${name}`);
        await db.insert(s.recipeItems).values({
          id: id(),
          recipeId: rid,
          ingredientId: iid,
          quantity: qty,
          unit,
          sortOrder: j,
        });
      }
    }
  }
  console.log(`· ${MENU.length} meals, ${dishCount} dishes, ${recipeCount} recipes`);

  /* --- shifts ----------------------------------------------------------- */
  const SHIFTS: [number, "breakfast" | "lunch" | "dinner" | "cleanup", string, string, number][] = [
    [0, "dinner", "17:00", "20:00", 4],
    [1, "breakfast", "08:00", "10:30", 4],
    [1, "lunch", "12:30", "14:30", 3],
    [1, "dinner", "16:30", "20:00", 5],
    [2, "breakfast", "08:00", "10:30", 4],
    [2, "lunch", "12:30", "14:30", 3],
    [2, "dinner", "16:30", "20:00", 5],
    [3, "breakfast", "08:00", "10:30", 4],
    [3, "dinner", "16:30", "20:00", 5],
    [4, "cleanup", "10:00", "13:00", 6],
  ];

  let cursor = 0;
  let positions = 0;
  let filled = 0;

  for (const [offset, type, start, end, required] of SHIFTS) {
    const sid = id();
    positions += required;
    await db.insert(s.shifts).values({
      id: sid,
      date: day(offset),
      mealType: type,
      startTime: start,
      endTime: end,
      requiredPeople: required,
    });

    /* Leave two shifts genuinely short — Bible §22 says understaffing must be
       impossible to overlook, so the seed has to contain some. */
    const short = type === "dinner" && offset === 2 ? 2 : type === "breakfast" && offset === 3 ? 1 : 0;
    const take = Math.max(0, required - short);

    for (let k = 0; k < take; k++) {
      await db.insert(s.shiftAssignments).values({
        id: id(),
        shiftId: sid,
        userId: userIds[cursor % userIds.length],
        source: "self",
      });
      cursor++;
      filled++;
    }
  }
  console.log(`· ${SHIFTS.length} shifts — ${filled}/${positions} positions filled`);

  /* --- shopping: the non-recipe reality (Bible §29) --------------------- */
  const SUPPLIES: [string, string, number, string, number][] = [
    ["נייר סופג", "supplies", 12, "unit", 6],
    ["שקיות זבל גדולות", "supplies", 4, "package", 18],
    ["נוזל כלים", "supplies", 3, "bottle", 14],
    ["שקיות אשפה קטנות", "supplies", 2, "package", 9],
    ["נייר אלומיניום", "supplies", 4, "unit", 12],
    ["כפפות חד פעמיות", "supplies", 2, "package", 22],
    ["גפרורים ומצית", "supplies", 5, "unit", 5],
    ["מים מינרלים", "drinks", 60, "bottle", 7],
  ];

  for (const [name, category, qty, unit, cost] of SUPPLIES) {
    await db.insert(s.shoppingItems).values({
      id: id(),
      name,
      category,
      unit,
      manualQuantity: qty,
      estimatedUnitCost: cost,
      isManual: true,
      status: "needed",
    });
  }
  console.log(`· ${SUPPLIES.length} non-recipe supplies`);

  console.log(
    "\ndone. sign in with any seeded email, password: shmifting" +
      "\nkitchen lead: tomer@shmifting.camp",
  );
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
