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
        with: {
          suggester: { columns: { name: true } },
          /* Only the count is surfaced — enough for HQ to show which evenings
             have been costed, without dragging every recipe into every list. */
          costedDishes: { columns: { id: true } },
        },
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
    costedDishes: number;
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
      costedDishes: option.costedDishes.length,
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
        with: {
          suggester: { columns: { name: true } },
          /* Only the count is surfaced — enough for HQ to show which evenings
             have been costed, without dragging every recipe into every list. */
          costedDishes: { columns: { id: true } },
        },
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

/* ============================================================================
   LIVE STANDINGS — what the camp is choosing, while it chooses it

   Deliberately a separate function from summariseRound rather than a filtered
   view of it. That one carries `nonVoters` — a list of people who have not
   voted yet — which is a Kitchen Lead's chasing list and nobody else's
   business. Building the member view by remembering to strip a field is the
   kind of thing that survives exactly until someone refactors it, so the two
   never share a shape.

   Everything here is aggregate. How many flames an evening has and how many
   people gave them is the camp talking to itself; who voted for what is not
   exposed, because a member should be able to vote for the unpopular thing
   without it being a public position.
   ======================================================================== */

export interface LiveStanding {
  id: string;
  title: string;
  description: string | null;
  dishes: string | null;
  tags: string[];
  accent: string;
  flames: number;
  voters: number;
  /* Share of the leader, for bar widths — not share of total, which makes
     every bar tiny once twelve evenings split the vote. */
  strength: number;
  rank: number;
  /* Inside the number of nights the camp will actually cook. */
  makingIt: boolean;
}

export const getLiveStandings = cache(async () => {
  const rounds = await getRounds();
  const round = rounds.find((r) => r.status === "open");
  if (!round) return null;

  const diners = await getDiners();
  const voterIds = new Set(
    round.votes.filter((v) => v.flames > 0).map((v) => v.userId),
  );

  const scored = round.options.map((option) => {
    const votes = round.votes.filter(
      (v) => v.optionId === option.id && v.flames > 0,
    );
    return {
      id: option.id,
      title: option.title,
      description: option.description,
      dishes: option.dishes,
      tags: option.tags,
      accent: option.accent,
      flames: votes.reduce((s, v) => s + v.flames, 0),
      voters: votes.length,
    };
  });

  /* Ties broken by name so the order does not shuffle between page loads —
     a leaderboard that reorders itself while you read it is unreadable. */
  const ranked = [...scored].sort(
    (a, b) => b.flames - a.flames || a.title.localeCompare(b.title, "he"),
  );
  const top = ranked[0]?.flames ?? 0;

  /* One flame per evening the camp cooks, so the token budget IS the number
     of nights — the cut line follows it without a second setting to keep in
     sync. */
  const nights = round.tokensPerVoter;

  const standings: LiveStanding[] = ranked.map((option, i) => ({
    ...option,
    strength: top ? Math.round((option.flames / top) * 100) : 0,
    rank: i + 1,
    makingIt: option.flames > 0 && i < nights,
  }));

  return {
    roundId: round.id,
    title: round.title,
    closesAt: round.closesAt,
    nights,
    standings,
    voters: voterIds.size,
    eligible: diners.length,
    totalFlames: round.votes.reduce((s, v) => s + v.flames, 0),
  };
});

export type LiveStandings = NonNullable<
  Awaited<ReturnType<typeof getLiveStandings>>
>;
