"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings, users } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";

export interface SettingsState {
  error?: string;
  ok?: boolean;
}

export async function updateCampSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await assertAdmin();

  const parseDate = (key: string) => {
    const raw = String(formData.get(key) ?? "");
    if (!raw) return null;
    const d = new Date(`${raw}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const departure = parseDate("departureDate");
  const festivalStart = parseDate("festivalStart");
  const festivalEnd = parseDate("festivalEnd");

  if (!departure) return { error: "צריך תאריך יציאה" };
  if (!festivalStart || !festivalEnd) return { error: "צריך תאריכי פסטיבל" };
  if (festivalEnd < festivalStart) {
    return { error: "תאריך הסיום לפני תאריך ההתחלה" };
  }

  const shiftsPerPerson = Number(formData.get("shiftsPerPerson") ?? 2);
  if (!Number.isFinite(shiftsPerPerson) || shiftsPerPerson < 0) {
    return { error: "מכסת משמרות לא תקינה" };
  }

  const code = String(formData.get("inviteCode") ?? "").trim().toUpperCase();
  if (code.length < 4) return { error: "קוד הקמפ צריך לפחות 4 תווים" };

  await db
    .update(settings)
    .set({
      campName: String(formData.get("campName") ?? "").trim() || "SHMIFTING",
      inviteCode: code,
      departureDate: departure,
      festivalStart,
      festivalEnd,
      shiftsPerPerson: Math.round(shiftsPerPerson),
      shiftsOpenAt: parseDate("shiftsOpenAt"),
      updatedAt: new Date(),
    })
    .where(eq(settings.id, "camp"));

  revalidatePath("/", "layout");
  return { ok: true };
}

/* Bible §50: two roles, and the architecture should not make a third
   impossible — but promoting somebody is a real decision, so it lives here
   rather than inline in the people table. */
export async function setUserRole(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!userId || !["shmifter", "admin"].includes(role)) return;

  /* Never let the last Kitchen Lead demote themselves out of the kitchen. */
  if (userId === admin.id && role !== "admin") {
    const admins = await db.query.users.findMany({
      where: eq(users.role, "admin"),
    });
    if (admins.length <= 1) return;
  }

  await db
    .update(users)
    .set({ role: role as "shmifter" | "admin", updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/hq/settings");
  revalidatePath("/hq/people");
}
