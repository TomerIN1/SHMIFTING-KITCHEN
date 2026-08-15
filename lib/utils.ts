import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function newId(): string {
  return crypto.randomUUID();
}

/* ---------------------------------------------------------------------------
   HEBREW DATES & NUMBERS
   Bible §45 / Design Book §32: Hebrew is the primary language, and numbers
   inside RTL text are a first-class correctness problem, not a detail.
   ------------------------------------------------------------------------ */

const HE_DAYS = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export function hebrewDayName(date: Date): string {
  return HE_DAYS[date.getDay()];
}

/** "יום חמישי" */
export function hebrewDay(date: Date): string {
  return `יום ${hebrewDayName(date)}`;
}

/** "12 במאי" */
export function hebrewDate(date: Date): string {
  return `${date.getDate()} ב${HE_MONTHS[date.getMonth()]}`;
}

/** "יום חמישי, 12 במאי" */
export function hebrewFullDate(date: Date): string {
  return `${hebrewDay(date)}, ${hebrewDate(date)}`;
}

/** "12.5" — short numeric form for dense tables. */
export function shortDate(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Money, in the camp's currency, with no fractional agorot noise. */
export function money(amount: number, currency = "₪"): string {
  const rounded = Math.round(amount);
  return `${currency}${rounded.toLocaleString("en-US")}`;
}

/** Hebrew plural for counted things: 1 → "איש", otherwise "אנשים". */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function mealCount(n: number): string {
  return n === 1 ? "ארוחה אחת" : `${n} ארוחות`;
}

export function peopleCount(n: number): string {
  return n === 1 ? "איש אחד" : `${n} אנשים`;
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Stable pseudo-random in [0,1) from a string — used to give illustrated
    objects fixed "hand-drawn" offsets that never change between renders,
    so nothing jumps around during hydration. */
export function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
