/* ============================================================================
   ALLERGENS & RESTRICTIONS
   Bible §11: "The product should distinguish clearly between Allergy / safety
   concern and Preference / dislike. These concepts must not be merged."

   This file holds that distinction as data:
     ALLERGENS    → safety. Drives conflict detection and warnings.
     RESTRICTIONS → sensitivities and choices. Drives coverage, not alarms.
     DISLIKES     → free text. Signal only. Never generates a warning.
   ========================================================================= */

export type AllergenKey =
  | "gluten"
  | "dairy"
  | "eggs"
  | "peanuts"
  | "tree_nuts"
  | "sesame"
  | "soy"
  | "fish"
  | "shellfish"
  | "celery"
  | "mustard"
  | "sulfites"
  | "legumes"
  | "nightshade"
  | "citrus"
  | "other";

export interface AllergenDef {
  key: AllergenKey;
  he: string;
  /* Words that imply this allergen when they appear in an ingredient name.
     Hebrew first — the ingredient catalogue is written in Hebrew. */
  match: string[];
}

export const ALLERGENS: AllergenDef[] = [
  {
    key: "gluten",
    he: "גלוטן",
    match: ["קמח", "פסטה", "לחם", "פיתה", "בורגול", "קוסקוס", "שעורה", "סולת", "פירורי לחם", "טורטיה", "בירה", "סויה רוטב"],
  },
  {
    key: "dairy",
    he: "חלב",
    match: ["חלב", "גבינה", "חמאה", "יוגורט", "שמנת", "לבנה", "קוטג", "מוצרלה", "פרמזן", "פטה", "גהי"],
  },
  { key: "eggs", he: "ביצים", match: ["ביצה", "ביצים", "מיונז", "חלבון", "חלמון"] },
  { key: "peanuts", he: "בוטנים", match: ["בוטן", "בוטנים", "חמאת בוטנים"] },
  {
    key: "tree_nuts",
    he: "אגוזים",
    match: ["אגוז", "אגוזים", "שקד", "שקדים", "קשיו", "פקאן", "פיסטוק", "לוז", "מקדמיה"],
  },
  { key: "sesame", he: "שומשום", match: ["שומשום", "טחינה", "חלבה"] },
  { key: "soy", he: "סויה", match: ["סויה", "טופו", "אדממה", "מיסו", "טמפה"] },
  { key: "fish", he: "דגים", match: ["דג", "דגים", "סלמון", "טונה", "אנשובי", "רוטב דגים"] },
  { key: "shellfish", he: "פירות ים", match: ["שרימפס", "סרטן", "צדפ", "קלמרי", "פירות ים"] },
  { key: "celery", he: "סלרי", match: ["סלרי"] },
  { key: "mustard", he: "חרדל", match: ["חרדל"] },
  { key: "sulfites", he: "גופרית / סולפיטים", match: ["סולפיט", "יין", "פירות יבשים"] },
  { key: "legumes", he: "קטניות", match: ["חומוס", "עדשים", "שעועית", "אפונה", "פול", "גרגרי חומוס"] },
  { key: "nightshade", he: "סולניים", match: ["עגבני", "חציל", "פלפל", "תפוח אדמה"] },
  { key: "citrus", he: "הדרים", match: ["לימון", "תפוז", "ליים", "אשכולית", "קלמנטינ"] },
  { key: "other", he: "אחר", match: [] },
];

export const ALLERGEN_MAP = new Map(ALLERGENS.map((a) => [a.key, a]));

export function allergenLabel(key: string, custom?: string | null): string {
  if (key === "other") return custom?.trim() || "אחר";
  return ALLERGEN_MAP.get(key as AllergenKey)?.he ?? custom?.trim() ?? key;
}

/* Severity carries operational meaning, not just a colour.
   Bible §46: never depend on colour alone — each level has its own word,
   its own handling line, and its own weight. */
export const SEVERITY = {
  avoid: {
    he: "להימנע",
    handling: "לא להגיש לאדם הזה",
    weight: 1,
  },
  severe: {
    he: "חמור",
    handling: "מנה נפרדת. כלים נפרדים. לוודא מול האדם",
    weight: 2,
  },
  anaphylaxis: {
    he: "אנפילקסיס",
    handling: "סכנת חיים. הפרדה מוחלטת. לוודא שיש מזרק אפיפן בקמפ",
    weight: 3,
  },
} as const;

export type SeverityKey = keyof typeof SEVERITY;

export function severityLabel(key: string) {
  return SEVERITY[key as SeverityKey] ?? SEVERITY.avoid;
}

/* --- Restrictions: sensitivities and choices, NOT safety ---------------- */

export const RESTRICTIONS = [
  { key: "gluten_free", he: "ללא גלוטן", excludes: ["gluten"] },
  { key: "lactose_free", he: "ללא לקטוז", excludes: ["dairy"] },
  { key: "no_pork", he: "ללא חזיר", excludes: [] },
  { key: "kosher_style", he: "לא מערבב בשר וחלב", excludes: [] },
  { key: "no_spicy", he: "לא חריף", excludes: [] },
  { key: "no_raw_fish", he: "ללא דג נא", excludes: [] },
  { key: "low_carb", he: "מפחית פחמימות", excludes: [] },
] as const;

export const RESTRICTION_MAP = new Map(RESTRICTIONS.map((r) => [r.key, r]));

export function restrictionLabel(key: string) {
  return RESTRICTION_MAP.get(key as never)?.he ?? key;
}

/* --- Dietary patterns --------------------------------------------------- */

export const DIETARY_PATTERNS = {
  omnivore: { he: "אוכל.ת הכל", short: "הכל", order: 0 },
  vegetarian: { he: "צמחוני.ת", short: "צמחוני", order: 1 },
  vegan: { he: "טבעוני.ת", short: "טבעוני", order: 2 },
} as const;

export function dietaryLabel(key: string) {
  return DIETARY_PATTERNS[key as keyof typeof DIETARY_PATTERNS]?.he ?? key;
}

/* A vegan can eat vegan food; a vegetarian can eat vegetarian and vegan food;
   an omnivore can eat anything. This one function decides every coverage
   number in the product. */
export function canEat(
  pattern: string,
  dishDietary: string,
): boolean {
  if (pattern === "omnivore") return true;
  if (pattern === "vegetarian") return dishDietary !== "omnivore";
  if (pattern === "vegan") return dishDietary === "vegan";
  return true;
}

export const SPICE_LEVELS = [
  { value: 0, he: "בלי חריף בכלל", flames: 0 },
  { value: 1, he: "רמז של חריפות", flames: 1 },
  { value: 2, he: "חריף נעים", flames: 2 },
  { value: 3, he: "אוהב.ת שזה בוער", flames: 3 },
  { value: 4, he: "תשרפו לי את הפנים", flames: 4 },
] as const;

/* Infer allergens from an ingredient name. This is a *suggestion* engine for
   the Kitchen Lead when creating ingredients — it never silently overrides the
   explicit `allergens` column, because guessing wrong about safety is worse
   than not guessing at all. */
export function suggestAllergens(ingredientName: string): AllergenKey[] {
  const name = ingredientName.trim();
  if (!name) return [];
  const found = new Set<AllergenKey>();
  for (const def of ALLERGENS) {
    for (const token of def.match) {
      if (name.includes(token)) {
        found.add(def.key);
        break;
      }
    }
  }
  return [...found];
}
