"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { voteRounds, votes } from "@/lib/db/schema";
import { assertUser } from "@/lib/auth/guard";
import { newId } from "@/lib/utils";

/* ============================================================================
   CASTING FLAMES — Bible §13

   "Members should be able to edit their vote while the voting round remains
    open. Once voting closes, results become final for that round."

   The whole allocation is replaced on every save rather than incremented, so
   the token budget can be checked once, on the server, against the round's own
   configured `tokensPerVoter` — never against a number hard-coded in the UI.
   ========================================================================= */

const schema = z.object({
  roundId: z.string().min(1),
  allocation: z.record(z.string(), z.number().int().min(0).max(20)),
});

export interface VoteState {
  ok?: boolean;
  error?: string;
  savedAt?: number;
}

export async function castVote(
  _prev: VoteState,
  formData: FormData,
): Promise<VoteState> {
  const user = await assertUser();

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "משהו השתבש. נסו שוב." };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "ההצבעה לא תקינה" };

  const { roundId, allocation } = parsed.data;

  const round = await db.query.voteRounds.findFirst({
    where: eq(voteRounds.id, roundId),
    with: { options: true },
  });

  if (!round) return { error: "ההצבעה הזו לא קיימת" };
  if (round.status !== "open") {
    return { error: "ההצבעה הזו כבר נסגרה" };
  }
  if (round.closesAt && round.closesAt.getTime() < Date.now()) {
    return { error: "זמן ההצבעה נגמר" };
  }

  const validOptionIds = new Set(round.options.map((o) => o.id));
  const total = Object.entries(allocation).reduce((sum, [optionId, flames]) => {
    if (!validOptionIds.has(optionId)) return sum;
    return sum + flames;
  }, 0);

  const cap = round.maxPerOption;
  if (cap !== null && Object.values(allocation).some((f) => f > cap)) {
    return {
      error:
        cap === 1
          ? "להבה אחת לכל ערב — פזרו אותן על ערבים שונים"
          : `עד ${cap} להבות לכל אפשרות`,
    };
  }

  if (total > round.tokensPerVoter) {
    return { error: `יש לכם רק ${round.tokensPerVoter} להבות` };
  }

  await db
    .delete(votes)
    .where(and(eq(votes.roundId, roundId), eq(votes.userId, user.id)));

  for (const [optionId, flames] of Object.entries(allocation)) {
    if (!validOptionIds.has(optionId) || flames <= 0) continue;
    await db.insert(votes).values({
      id: newId(),
      roundId,
      optionId,
      userId: user.id,
      flames,
    });
  }

  revalidatePath("/vote");
  revalidatePath("/");
  revalidatePath("/hq/votes");
  revalidatePath("/hq");

  return { ok: true, savedAt: Date.now() };
}

/* Kept close to the action it guards — a page that renders options needs the
   same "is this still open?" answer the write path uses. */
export async function roundIsOpen(roundId: string): Promise<boolean> {
  const round = await db.query.voteRounds.findFirst({
    where: eq(voteRounds.id, roundId),
  });
  if (!round || round.status !== "open") return false;
  return !round.closesAt || round.closesAt.getTime() >= Date.now();
}

/* ============================================================================
   SUGGESTING AN IDEA — Bible §12

   Voting is meant to feel like a camp activity, not a survey somebody else
   wrote. A member who knows exactly what the desert needs on Wednesday should
   be able to put it on the board rather than lobby the Kitchen Lead in a
   group chat.

   Ideas appear immediately, credited by name. There is no approval queue on
   purpose: a queue makes a warm act feel like submitting a form, and the Lead
   can already edit or delete any option from HQ (Bible §23). The name is the
   moderation — people behave when their idea has their face on it.
   ========================================================================= */

const suggestSchema = z.object({
  roundId: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(2, "צריך שם למנה")
    .max(80, "קצר יותר, בבקשה"),
  description: z.string().trim().max(300).optional(),
});

export interface SuggestState {
  ok?: boolean;
  error?: string;
}

export async function suggestOption(
  _prev: SuggestState,
  formData: FormData,
): Promise<SuggestState> {
  const user = await assertUser();

  const parsed = suggestSchema.safeParse({
    roundId: formData.get("roundId"),
    title: formData.get("title"),
    description: String(formData.get("description") ?? "") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { roundId, title, description } = parsed.data;

  /* Only into a round that is actually open. A closed round's results are
     final (Bible §13), and an upcoming one is still the Lead's draft. */
  const round = await db.query.voteRounds.findFirst({
    where: eq(voteRounds.id, roundId),
    with: { options: true },
  });
  if (!round) return { error: "ההצבעה לא נמצאה" };
  if (round.status !== "open") return { error: "ההצבעה סגורה לרעיונות חדשים" };

  /* Same dish twice helps nobody — it splits the flames between two identical
     cards and makes a popular idea look unpopular. */
  const exists = round.options.some(
    (o) => o.title.trim().toLowerCase() === title.toLowerCase(),
  );
  if (exists) return { error: "הרעיון הזה כבר על הלוח" };

  const palette = ["sun", "terracotta", "pink", "lavender", "dust-blue", "peach"];

  const { voteOptions } = await import("@/lib/db/schema");
  await db.insert(voteOptions).values({
    id: newId(),
    roundId,
    title,
    description: description || null,
    suggestedBy: user.id,
    accent: palette[round.options.length % palette.length],
    sortOrder: round.options.length,
  });

  revalidatePath("/vote");
  revalidatePath("/hq/votes", "layout");
  return { ok: true };
}
