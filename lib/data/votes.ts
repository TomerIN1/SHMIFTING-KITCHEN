import "server-only";
import { cache } from "react";
import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { voteRounds } from "@/lib/db/schema";
import { getDiners } from "./camp";

/* ============================================================================
   VOTING RESULTS — Bible §13, §14
   Weighted flames, participation, and who has not voted.

   Bible §14 asks for "strongest and weakest options" — so results carry a
   share of total flames rather than a bare count, because 12 flames means
   nothing until you know whether 20 or 200 were given out.
   ========================================================================= */

export const getRounds = cache(async () => {
  return db.query.voteRounds.findMany({
    orderBy: [desc(voteRounds.createdAt)],
    with: {
      options: {
        orderBy: (o, { asc: a }) => [a(o.sortOrder)],
        with: { suggester: { columns: { name: true } } },
      },
      votes: true,
    },
  });
});

export type RoundRow = Awaited<ReturnType<typeof getRounds>>[number];

export interface RoundResult {
  round: RoundRow;
  totalFlames: number;
  voters: number;
  eligible: number;
  participation: number;
  options: {
    id: string;
    title: string;
    description: string | null;
    dishes: string | null;
    dietaryNote: string | null;
    dietary: string;
    tags: string[];
    mealDate: Date | null;
    imageUrl: string | null;
    accent: string;
    flames: number;
    share: number;
    voters: number;
  }[];
  nonVoters: { userId: string; name: string }[];
  winner: string | null;
}

export async function summariseRound(round: RoundRow): Promise<RoundResult> {
  const diners = await getDiners();
  const totalFlames = round.votes.reduce((s, v) => s + v.flames, 0);
  const voterIds = new Set(
    round.votes.filter((v) => v.flames > 0).map((v) => v.userId),
  );

  const options = round.options.map((option) => {
    const votes = round.votes.filter((v) => v.optionId === option.id);
    const flames = votes.reduce((s, v) => s + v.flames, 0);
    return {
      id: option.id,
      title: option.title,
      description: option.description,
      dishes: option.dishes,
      dietary: option.dietary,
      tags: option.tags,
      mealDate: option.mealDate,
      dietaryNote: option.dietaryNote,
      imageUrl: option.imageUrl,
      accent: option.accent,
      flames,
      share: totalFlames ? Math.round((flames / totalFlames) * 100) : 0,
      voters: votes.filter((v) => v.flames > 0).length,
    };
  });

  const ranked = [...options].sort((a, b) => b.flames - a.flames);

  return {
    round,
    totalFlames,
    voters: voterIds.size,
    eligible: diners.length,
    participation: diners.length
      ? Math.round((voterIds.size / diners.length) * 100)
      : 0,
    options,
    nonVoters: diners
      .filter((d) => !voterIds.has(d.userId))
      .map((d) => ({ userId: d.userId, name: d.name })),
    /* Only call a winner when one actually leads — a tie is information the
       Kitchen Lead needs, not something to resolve silently. */
    winner:
      ranked.length > 1 && ranked[0].flames > ranked[1].flames && ranked[0].flames > 0
        ? ranked[0].id
        : null,
  };
}

export const getRoundResults = cache(async () => {
  const rounds = await getRounds();
  return Promise.all(rounds.map(summariseRound));
});

/** What a specific member sees: open rounds plus how they spent their flames. */
export const getRoundsForMember = cache(async (userId: string) => {
  const rounds = await db.query.voteRounds.findMany({
    orderBy: [asc(voteRounds.closesAt), desc(voteRounds.createdAt)],
    with: {
      options: {
        orderBy: (o, { asc: a }) => [a(o.sortOrder)],
        with: { suggester: { columns: { name: true } } },
      },
      votes: true,
    },
  });

  return rounds.map((round) => {
    const mine = round.votes.filter((v) => v.userId === userId);
    const spent = mine.reduce((s, v) => s + v.flames, 0);
    return {
      ...round,
      myVotes: Object.fromEntries(mine.map((v) => [v.optionId, v.flames])),
      spent,
      remaining: round.tokensPerVoter - spent,
      hasVoted: spent > 0,
    };
  });
});

export type MemberRound = Awaited<ReturnType<typeof getRoundsForMember>>[number];
