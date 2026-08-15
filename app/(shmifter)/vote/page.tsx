import Image from "next/image";
import { requireUser } from "@/lib/auth/guard";
import { getRoundsForMember, type MemberRound } from "@/lib/data/votes";
import { VoteBoard } from "./VoteBoard";
import { SuggestIdea } from "./SuggestIdea";
import { EmptyState } from "@/components/shmifting/EmptyState";
import { StatusChip } from "@/components/shmifting/Status";
import { Glyph } from "@/components/shmifting/Glyph";
import { HERO } from "@/components/shmifting/assets";
import { hebrewFullDate } from "@/lib/utils";
import { mealTypeLabel } from "@/lib/domain/categories";
import { daysUntil } from "@/lib/domain/readiness";

export const metadata = { title: "הצבעות — SHMIFTING KITCHEN" };

/* ============================================================================
   MEAL VOTING — Bible §12, §13

   "It should feel like a camp activity rather than a survey."

   Closed rounds stay on the page rather than disappearing, because seeing
   what the camp already chose is part of the anticipation (Bible §16) — but
   they are shown as a result, not as a form you can still touch.
   ========================================================================= */

export default async function VotePage() {
  const user = await requireUser();
  const rounds = await getRoundsForMember(user.id);

  const open = rounds.filter((r) => r.status === "open");
  const closed = rounds.filter((r) => r.status === "closed");
  const upcoming = rounds.filter((r) => r.status === "upcoming");

  return (
    <div className="space-y-9">
      <section className="relative overflow-hidden rounded-[24px_30px_22px_28px] border-[3px] border-ink shadow-[5px_6px_0_0_var(--color-ink)]">
        <Image
          src={HERO.vote}
          alt=""
          priority
          placeholder="blur"
          className="absolute inset-0 h-full w-full object-cover"
          sizes="(max-width: 1024px) 100vw, 1100px"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_25%,rgba(18,19,26,0.2),rgba(18,19,26,0.9)_74%)]"
        />
        <div className="relative px-5 py-10 text-center sm:px-9 sm:py-14">
          <p className="font-display text-xs tracking-[0.28em] text-sun">
            THE GREAT MENU VOTE
          </p>
          <h1 className="shm-poster mx-auto mt-2 max-w-lg text-3xl leading-tight text-cream sm:text-4xl">
            תנו את האש שלכם לאוכל שאתם רוצים.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream-2 sm:text-base">
            כל אחד מקבל כמה להבות. אפשר לתת את כולן למנה אחת, או לפזר. ככה נדע
            לא רק מה בחרתם — אלא כמה בא לכם.
          </p>
        </div>
      </section>

      {open.length === 0 && closed.length === 0 && upcoming.length === 0 && (
        <EmptyState title="עוד אין על מה להצביע">
          מנהל.ת המטבח עוד לא פתח.ה הצבעה. כשזה יקרה — תמצאו את זה כאן, ונסמן
          לכם את זה בשלט.
        </EmptyState>
      )}

      {open.map((round) => (
        <OpenRound key={round.id} round={round} />
      ))}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl text-cream">בקרוב</h2>
          <ul className="space-y-2">
            {upcoming.map((round) => (
              <li
                key={round.id}
                className="flex items-center justify-between gap-3 rounded-[14px_17px_12px_16px] border-2 border-charcoal-5 bg-charcoal-2 px-4 py-3"
              >
                <span className="font-display text-cream">{round.title}</span>
                <StatusChip tone="idle">עוד לא נפתחה</StatusChip>
              </li>
            ))}
          </ul>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl text-cream">
            <Glyph name="check" className="text-good" strokeWidth={2.4} />
            הצבעות שנסגרו
          </h2>
          <ul className="space-y-3">
            {closed.map((round) => (
              <ClosedRound key={round.id} round={round} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function OpenRound({ round }: { round: MemberRound }) {
  const closesIn = round.closesAt ? daysUntil(round.closesAt) : null;

  return (
    <section aria-labelledby={`round-${round.id}`} className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`round-${round.id}`}
            className="font-display text-2xl leading-tight text-cream sm:text-3xl"
          >
            {round.title}
          </h2>
          {round.subtitle && (
            <p className="mt-1 text-sm text-cream-2/80">{round.subtitle}</p>
          )}
          {round.mealDate && (
            <p className="mt-1 text-[13px] text-cream-dim">
              {mealTypeLabel(round.mealType)} · {hebrewFullDate(round.mealDate)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {round.hasVoted && (
            <StatusChip tone="done">הצבעתם</StatusChip>
          )}
          <StatusChip tone="live">
            {closesIn === null
              ? "פתוחה"
              : closesIn <= 0
                ? "נסגרת היום"
                : closesIn === 1
                  ? "נסגרת מחר"
                  : `נסגרת בעוד ${closesIn} ימים`}
          </StatusChip>
        </div>
      </header>

      <VoteBoard
        roundId={round.id}
        tokens={round.tokensPerVoter}
        maxPerOption={round.maxPerOption}
        options={round.options}
        initial={round.myVotes}
      />

      {/* The board belongs to the camp, not to whoever wrote the list. */}
      <SuggestIdea roundId={round.id} />
    </section>
  );
}

function ClosedRound({ round }: { round: MemberRound }) {
  /* Bible §13: results are final once closed, and the Kitchen Lead still owns
     the menu — so this shows what the camp said, not "the winner is". */
  const totals = round.options.map((option) => ({
    option,
    flames: round.votes
      .filter((v) => v.optionId === option.id)
      .reduce((s, v) => s + v.flames, 0),
  }));
  const max = Math.max(1, ...totals.map((t) => t.flames));
  const total = totals.reduce((s, t) => s + t.flames, 0);

  return (
    <li className="rounded-[16px_20px_14px_18px] border-2 border-charcoal-5 bg-charcoal-2 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg text-cream">{round.title}</h3>
        <span className="text-[13px] text-cream-dim">
          {total} להבות מכל הקמפ
        </span>
      </div>

      <ul className="space-y-2.5">
        {totals.map(({ option, flames }) => {
          const mine = round.myVotes[option.id] ?? 0;
          return (
            <li key={option.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="text-cream-2">
                  {option.title}
                  {mine > 0 && (
                    <span className="ms-2 text-[12px] text-sun">
                      נתתם {mine}
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-cream-dim" dir="ltr">
                  {flames}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-charcoal-4">
                <div
                  className="h-full rounded-full bg-sun"
                  style={{ width: `${(flames / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
