"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, shiftAssignments, shoppingItems, votes } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";

/* ============================================================================
   MANAGING THE ROSTER — who is actually coming

   Two operations, because "not coming" and "delete" are genuinely different
   situations and collapsing them loses information the kitchen needs.

   ── NOT COMING ────────────────────────────────────────────────────────────
   The normal case. Somebody drops out three weeks before the burn. They must
   disappear from every operational calculation — the diner set, dietary
   coverage, the allergy sheet, the shift quota, readiness — because cooking
   for a person who is not there, and reserving attention for an allergy that
   is not there, are both real failures (Bible §24).

   But their flames stay counted. Bible §13 makes closed voting results final,
   and the menu was chosen from those numbers. Retroactively deleting a voter
   would rewrite a decision that has already been acted on. Reversible.

   ── DELETE ────────────────────────────────────────────────────────────────
   For a duplicate, a test account, a typo. The row and everything cascading
   from it goes. Irreversible, so the caller has to have seen what it costs
   first — see `describeRemoval`.
   ========================================================================= */

export interface PeopleState {
  error?: string;
  ok?: boolean;
}

function touch() {
  /* Removing a person changes coverage, shifts, readiness and the pack, so
     essentially the whole product has to be re-derived. */
  revalidatePath("/hq", "layout");
  revalidatePath("/", "layout");
}

/** What a hard delete would actually destroy. Shown before it happens. */
export async function describeRemoval(userId: string): Promise<{
  name: string;
  voteCount: number;
  closedRoundVotes: number;
  shiftCount: number;
  shoppingCount: number;
  allergyCount: number;
} | null> {
  await assertAdmin();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { allergies: true },
  });
  if (!user) return null;

  const userVotes = await db.query.votes.findMany({
    where: eq(votes.userId, userId),
    with: { round: true },
  });

  const [{ shiftCount } = { shiftCount: 0 }] = await db
    .select({ shiftCount: sql<number>`count(*)` })
    .from(shiftAssignments)
    .where(eq(shiftAssignments.userId, userId));

  const [{ shoppingCount } = { shoppingCount: 0 }] = await db
    .select({ shoppingCount: sql<number>`count(*)` })
    .from(shoppingItems)
    .where(eq(shoppingItems.assigneeId, userId));

  return {
    name: user.name,
    voteCount: userVotes.filter((v) => v.flames > 0).length,
    closedRoundVotes: userVotes.filter(
      (v) => v.flames > 0 && v.round?.status === "closed",
    ).length,
    shiftCount: Number(shiftCount),
    shoppingCount: Number(shoppingCount),
    allergyCount: user.allergies.length,
  };
}

/* ---- not coming --------------------------------------------------------- */

export async function setNotComing(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  /* You cannot quietly remove yourself from the camp you are running. */
  if (userId === admin.id) return;

  await db
    .update(users)
    .set({ notComingAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));

  /* Free their shifts so the hole becomes visible immediately. Bible §22:
     understaffing must be impossible to overlook — a shift silently covered
     by somebody who is not turning up is the worst version of that. */
  await db
    .delete(shiftAssignments)
    .where(eq(shiftAssignments.userId, userId));

  /* Hand back anything they were buying, rather than leaving it looking
     assigned. */
  await db
    .update(shoppingItems)
    .set({ assigneeId: null, status: "needed", updatedAt: new Date() })
    .where(
      and(
        eq(shoppingItems.assigneeId, userId),
        eq(shoppingItems.status, "assigned"),
      ),
    );
  await db
    .update(shoppingItems)
    .set({ assigneeId: null, updatedAt: new Date() })
    .where(eq(shoppingItems.assigneeId, userId));

  touch();
}

export async function setComing(formData: FormData): Promise<void> {
  await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  /* Shifts are not restored — somebody else may have taken the slot in the
     meantime, and silently double-booking a shift would be worse than asking
     them to pick again. */
  await db
    .update(users)
    .set({ notComingAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  touch();
}

/* ---- delete permanently -------------------------------------------------- */

export async function removePerson(
  _prev: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const confirmedName = String(formData.get("confirmName") ?? "").trim();

  if (!userId) return { error: "לא נמצא אדם כזה" };

  if (userId === admin.id) {
    return { error: "אי אפשר למחוק את עצמכם. תנו למישהו אחר ניהול קודם." };
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return { error: "לא נמצא אדם כזה" };

  if (user.role === "admin") {
    const admins = await db.query.users.findMany({
      where: eq(users.role, "admin"),
    });
    if (admins.length <= 1) {
      return { error: "זה המנהל.ת האחרון.ה של המטבח. אי אפשר למחוק." };
    }
  }

  /* Typing the name is the confirmation. A person is not a row — deleting one
     should take a deliberate act, not a reflex click on a red button. */
  if (confirmedName !== user.name) {
    return {
      error: `כדי למחוק, הקלידו את השם המדויק: ${user.name}`,
    };
  }

  /* Cascades to profile, allergies, votes and shift assignments; shopping
     assignments fall back to null by the schema's onDelete rule. */
  await db.delete(users).where(eq(users.id, userId));

  touch();
  return { ok: true };
}
