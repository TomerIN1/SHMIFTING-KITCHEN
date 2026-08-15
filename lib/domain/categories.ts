/* ============================================================================
   SHOPPING CATEGORIES — Bible §27
   "Categories should support the actual shopping workflow rather than exist
   only for visual organization."

   So they are ordered the way a person actually walks a shuk and a
   supermarket, not alphabetically: fresh produce first (bought last, spoils
   first), cleaning supplies last.
   ========================================================================= */

export interface CategoryDef {
  key: string;
  he: string;
  /* Palette member from the Design Book — used for the illustrated category
     headers in the shopping list (Design Book §45). */
  accent: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: "produce", he: "ירקות ופירות", accent: "good" },
  { key: "refrigerated", he: "מקרר", accent: "dust-blue" },
  { key: "dry", he: "יבשים", accent: "sun" },
  { key: "bakery", he: "מאפייה", accent: "peach" },
  { key: "spices", he: "תבלינים", accent: "terracotta" },
  { key: "drinks", he: "שתייה", accent: "lavender" },
  { key: "snacks", he: "חטיפים ונשנושים", accent: "shmift-pink" },
  { key: "supplies", he: "ציוד וניקיון", accent: "dust-blue" },
  { key: "other", he: "שונות", accent: "cream" },
];

export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.key, c]));

export function categoryLabel(key: string): string {
  return CATEGORY_MAP.get(key)?.he ?? key;
}

export function categoryAccent(key: string): string {
  return CATEGORY_MAP.get(key)?.accent ?? "cream";
}

export function categoryOrder(key: string): number {
  const i = CATEGORIES.findIndex((c) => c.key === key);
  return i === -1 ? CATEGORIES.length : i;
}

/* ---------------------------------------------------------------------------
   MEAL TYPES — the desert clock (Design Book §22, §39)
   ------------------------------------------------------------------------ */

export const MEAL_TYPES = {
  breakfast: { he: "בוקר", order: 0, celestial: "sun-rising" },
  lunch: { he: "צהריים", order: 1, celestial: "sun-high" },
  dinner: { he: "ערב", order: 2, celestial: "moon" },
  snack: { he: "נשנוש", order: 3, celestial: "star" },
} as const;

export function mealTypeLabel(key: string): string {
  return MEAL_TYPES[key as keyof typeof MEAL_TYPES]?.he ?? key;
}

export function mealTypeOrder(key: string): number {
  return MEAL_TYPES[key as keyof typeof MEAL_TYPES]?.order ?? 9;
}

export const SHIFT_TYPES = {
  prep: { he: "הכנות", order: -1 },
  breakfast: { he: "בוקר", order: 0 },
  lunch: { he: "צהריים", order: 1 },
  dinner: { he: "ערב", order: 2 },
  cleanup: { he: "סידור וניקיון", order: 3 },
} as const;

export function shiftTypeLabel(key: string): string {
  return SHIFT_TYPES[key as keyof typeof SHIFT_TYPES]?.he ?? key;
}

export function shiftTypeOrder(key: string): number {
  return SHIFT_TYPES[key as keyof typeof SHIFT_TYPES]?.order ?? 9;
}

export const DISH_ROLES = {
  main: { he: "עיקרית", order: 0 },
  side: { he: "תוספת", order: 1 },
  salad: { he: "סלט", order: 2 },
  sauce: { he: "רוטב", order: 3 },
  bread: { he: "לחם", order: 4 },
  dessert: { he: "קינוח", order: 5 },
  drink: { he: "שתייה", order: 6 },
} as const;

export function dishRoleLabel(key: string): string {
  return DISH_ROLES[key as keyof typeof DISH_ROLES]?.he ?? key;
}

export function dishRoleOrder(key: string): number {
  return DISH_ROLES[key as keyof typeof DISH_ROLES]?.order ?? 9;
}
