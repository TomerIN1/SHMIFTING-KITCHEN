"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { voteRounds, voteOptions, users } from "@/lib/db/schema";
import { assertAdmin } from "@/lib/auth/guard";
import { newId } from "@/lib/utils";
import { isOptionTag } from "@/lib/domain/categories";

export interface VoteAdminState {
  error?: string;
  ok?: boolean;
  /* Bible §40: warn before closing an incomplete round, but let the Lead
     proceed once they have seen the warning. */
  confirmClose?: { missing: number };
}

function touch() {
  revalidatePath("/hq/votes", "layout");
  revalidatePath("/hq");
  revalidatePath("/vote");
  revalidatePath("/");
}

export async function createRound(
  _prev: VoteAdminState,
  formData: FormData,
): Promise<VoteAdminState> {
  await assertAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "צריך כותרת להצבעה" };

  const tokens = Number(formData.get("tokensPerVoter") ?? 3);
  if (!Number.isFinite(tokens) || tokens < 1 || tokens > 10) {
    return { error: "בין להבה אחת לעשר" };
  }

  const dateRaw = String(formData.get("mealDate") ?? "");
  const mealDate = dateRaw ? new Date(`${dateRaw}T12:00:00`) : null;
  const closesRaw = String(formData.get("closesAt") ?? "");
  const closesAt = closesRaw ? new Date(`${closesRaw}T23:59:00`) : null;

  const id = newId();
  await db.insert(voteRounds).values({
    id,
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    mealType: String(formData.get("mealType") ?? "dinner") as "dinner",
    mealDate: mealDate && !Number.isNaN(mealDate.getTime()) ? mealDate : null,
    closesAt: closesAt && !Number.isNaN(closesAt.getTime()) ? closesAt : null,
    tokensPerVoter: Math.round(tokens),
    status: "upcoming",
  });

  touch();
  redirect(`/hq/votes/${id}`);
}

export async function updateRound(
  _prev: VoteAdminState,
  formData: FormData,
): Promise<VoteAdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "הצבעה לא נמצאה" };

  const tokens = Number(formData.get("tokensPerVoter") ?? 3);
  const closesRaw = String(formData.get("closesAt") ?? "");
  const closesAt = closesRaw ? new Date(`${closesRaw}T23:59:00`) : null;

  await db
    .update(voteRounds)
    .set({
      title: String(formData.get("title") ?? "").trim() || "הצבעה",
      subtitle: String(formData.get("subtitle") ?? "").trim() || null,
      ...(Number.isFinite(tokens) && tokens >= 1 && tokens <= 10
        ? { tokensPerVoter: Math.round(tokens) }
        : {}),
      closesAt: closesAt && !Number.isNaN(closesAt.getTime()) ? closesAt : null,
      updatedAt: new Date(),
    })
    .where(eq(voteRounds.id, id));

  touch();
  return { ok: true };
}

export async function setRoundStatus(
  _prev: VoteAdminState,
  formData: FormData,
): Promise<VoteAdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const confirmed = String(formData.get("confirmed") ?? "") === "1";

  if (!id || !["upcoming", "open", "closed"].includes(status)) {
    return { error: "פעולה לא תקינה" };
  }

  if (status === "open") {
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(voteOptions)
      .where(eq(voteOptions.roundId, id));
    if (count < 2) {
      return { error: "צריך לפחות שתי אפשרויות כדי לפתוח הצבעה" };
    }
  }

  /* Bible §40: "Warn before closing an incomplete voting round." */
  if (status === "closed" && !confirmed) {
    const round = await db.query.voteRounds.findFirst({
      where: eq(voteRounds.id, id),
      with: { votes: true },
    });
    const voters = new Set(
      (round?.votes ?? []).filter((v) => v.flames > 0).map((v) => v.userId),
    ).size;
    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(users);
    const missing = Math.max(0, Number(total) - voters);
    if (missing > 0) {
      return { confirmClose: { missing } };
    }
  }

  await db
    .update(voteRounds)
    .set({
      status: status as "upcoming" | "open" | "closed",
      updatedAt: new Date(),
    })
    .where(eq(voteRounds.id, id));

  touch();
  return { ok: true };
}

export async function deleteRound(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(voteRounds).where(eq(voteRounds.id, id));
  touch();
  redirect("/hq/votes");
}

/* ---- options ------------------------------------------------------------ */


/* "2026-11-04" from a date input, or null when the Lead has not decided which
   evening this cuisine lands on yet. Noon avoids the timezone off-by-one that
   turns a Wednesday dinner into Tuesday. */
function optionDate(formData: FormData): Date | null {
  const raw = String(formData.get("mealDate") ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}


function optionTags(formData: FormData): string[] {
  return formData
    .getAll("tags")
    .map(String)
    .filter((t) => isOptionTag(t));
}

function optionDietary(formData: FormData): "omnivore" | "vegetarian" | "vegan" {
  const raw = String(formData.get("dietary") ?? "omnivore");
  return raw === "vegan" || raw === "vegetarian" ? raw : "omnivore";
}

export async function addOption(
  _prev: VoteAdminState,
  formData: FormData,
): Promise<VoteAdminState> {
  await assertAdmin();
  const roundId = String(formData.get("roundId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!roundId) return { error: "הצבעה לא נמצאה" };
  if (!title) return { error: "צריך שם לרעיון" };

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(voteOptions)
    .where(eq(voteOptions.roundId, roundId));

  const palette = ["sun", "terracotta", "pink", "lavender", "dust-blue", "peach"];

  await db.insert(voteOptions).values({
    id: newId(),
    roundId,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    dishes: String(formData.get("dishes") ?? "").trim() || null,
    dietaryNote: String(formData.get("dietaryNote") ?? "").trim() || null,
    mealDate: optionDate(formData),
    dietary: optionDietary(formData),
    tags: optionTags(formData),
    accent: palette[count % palette.length],
    sortOrder: count,
  });

  touch();
  return { ok: true };
}

export async function updateOption(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(voteOptions)
    .set({
      title: String(formData.get("title") ?? "").trim() || "רעיון",
      description: String(formData.get("description") ?? "").trim() || null,
      dishes: String(formData.get("dishes") ?? "").trim() || null,
      dietaryNote: String(formData.get("dietaryNote") ?? "").trim() || null,
      mealDate: optionDate(formData),
      dietary: optionDietary(formData),
      tags: optionTags(formData),
    })
    .where(eq(voteOptions.id, id));

  touch();
}

export async function deleteOption(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(voteOptions).where(eq(voteOptions.id, id));
  touch();
}

/* Bible §15: voting eventually becomes an actual menu. This turns a winning
   concept into a real meal with its dishes pre-filled, so the Kitchen Lead
   does not retype what the camp already chose. */
export async function promoteToMeal(formData: FormData): Promise<void> {
  await assertAdmin();
  const optionId = String(formData.get("optionId") ?? "");
  if (!optionId) return;

  const option = await db.query.voteOptions.findFirst({
    where: eq(voteOptions.id, optionId),
    with: { round: true },
  });
  if (!option?.round) return;

  const { meals, dishes } = await import("@/lib/db/schema");

  const mealId = newId();
  await db.insert(meals).values({
    id: mealId,
    date: option.mealDate ?? option.round.mealDate ?? new Date(),
    mealType:
      option.round.mealType === "other" ? "dinner" : option.round.mealType,
    title: option.title,
    concept: option.description,
    status: "proposed",
    sourceRoundId: option.round.id,
  });

  const lines = (option.dishes ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  for (const [i, name] of lines.entries()) {
    await db.insert(dishes).values({
      id: newId(),
      mealId,
      name,
      role: i === 0 ? "main" : "side",
      dietary: "omnivore",
      sortOrder: i,
    });
  }

  revalidatePath("/hq/menu", "layout");
  touch();
  redirect(`/hq/menu/${mealId}`);
}
