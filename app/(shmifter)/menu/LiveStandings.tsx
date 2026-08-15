import Image from "next/image";
import { Glyph } from "@/components/shmifting/Glyph";
import { OptionTags } from "@/components/shmifting/OptionTags";
import { StickerLink } from "@/components/shmifting/StickerButton";
import { OBJECT } from "@/components/shmifting/assets";
import { ACCENTS, type Accent } from "@/components/shmifting/accents";
import { hebrewFullDate, cn } from "@/lib/utils";
import { daysUntil } from "@/lib/domain/readiness";
import type { LiveStandings as Standings } from "@/lib/data/votes";

/* ============================================================================
   THE MENU, WHILE IT IS STILL BEING DECIDED — Bible §12, §16

   §16 protects the reveal: the final menu arrives as a moment, not as a live
   feed of the Kitchen Lead's work in progress. This does not touch that. What
   it shows is the camp's own votes, played back to the camp — which is §12's
   "voting should feel like a camp activity" taken to its conclusion. An
   activity you cannot see the state of is a form.

   Aggregate only. How many flames an evening has, and how many people gave
   them; never who. Voting for the unpopular thing should not be a public
   position, or people stop doing it.

   The cut line is the point of the screen. Twelve evenings, six nights — the
   line between "this is happening" and "this is not" is the single piece of
   information that makes somebody spend their last flame.
   ========================================================================= */

export function LiveStandings({ data }: { data: Standings }) {
  const { standings, nights, voters, eligible, closesAt, totalFlames } = data;
  const closesIn = closesAt ? daysUntil(closesAt) : null;
  const anyVotes = totalFlames > 0;

  /* Where the line falls in the rendered list — after the last evening that
     is currently making it, and only when the list is longer than that. */
  const cutAfter = standings.filter((s) => s.makingIt).length;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-[0.24em] text-sun">
            LIVE
          </p>
          <h2 className="shm-poster mt-1 text-2xl leading-tight text-cream sm:text-3xl">
            התפריט מצטייר עכשיו.
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-cream-2">
            {anyVotes
              ? `${nights} הערבים שיאספו הכי הרבה אש הם אלה שנבשל. זה מה שהקמפ בחר עד עכשיו — וזה עוד יכול להשתנות.`
              : `${nights} הערבים שיאספו הכי הרבה אש הם אלה שנבשל. עוד אף אחד לא הצביע — אתם יכולים להיות הראשונים.`}
          </p>
        </div>

        <div className="flex flex-col items-start gap-1.5 text-[13px] text-cream-dim sm:items-end">
          <span className="flex items-center gap-1.5">
            <Glyph name="people" strokeWidth={2} />
            {voters} מתוך {eligible} הצביעו
          </span>
          {closesAt && (
            <span className="flex items-center gap-1.5">
              <Glyph name="clock" strokeWidth={2} />
              {closesIn !== null && closesIn <= 0
                ? "ההצבעה נסגרת היום"
                : closesIn === 1
                  ? "נסגרת מחר"
                  : `נסגרת ב־${hebrewFullDate(closesAt)}`}
            </span>
          )}
        </div>
      </header>

      <ol className="space-y-2.5">
        {standings.map((option, i) => {
          const accent = ACCENTS[option.accent as Accent] ?? ACCENTS.sun;
          const showCut = cutAfter > 0 && i === cutAfter && i < standings.length;

          return (
            <li key={option.id}>
              {showCut && <CutLine nights={nights} />}

              <div
                className={cn(
                  "flex items-center gap-3 rounded-[15px_18px_13px_17px] border-2 px-3.5 py-3 sm:gap-4 sm:px-4",
                  option.makingIt
                    ? "border-ink shm-paper shadow-[3px_4px_0_0_var(--color-ink)]"
                    : "border-charcoal-5 bg-charcoal-2",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm tabular-nums",
                    option.makingIt
                      ? "border-ink bg-sun text-ink"
                      : "border-charcoal-5 text-cream-dim",
                  )}
                  aria-hidden
                >
                  {option.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3
                      className={cn(
                        "font-display text-[16px] leading-tight sm:text-[17px]",
                        option.makingIt ? "text-ink" : "text-cream",
                      )}
                    >
                      {option.title}
                    </h3>
                    <OptionTags tags={option.tags} onInk={option.makingIt} />
                  </div>

                  {/* Strength relative to the leader, so twelve evenings
                      splitting the vote still produce a readable bar. */}
                  <div
                    className={cn(
                      "mt-2 h-1.5 overflow-hidden rounded-full",
                      option.makingIt ? "bg-ink/15" : "bg-charcoal-5",
                    )}
                  >
                    <div
                      className={cn("h-full rounded-full", accent.bg)}
                      style={{ width: `${Math.max(option.strength, 2)}%` }}
                    />
                  </div>
                </div>

                <div className="shrink-0 text-end">
                  <span
                    className={cn(
                      "flex items-center justify-end gap-1 font-display text-lg tabular-nums",
                      option.makingIt ? "text-ink" : "text-cream",
                    )}
                  >
                    {option.flames}
                    <Image
                      src={OBJECT.flameLit}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[12px]",
                      option.makingIt ? "text-ink/60" : "text-cream-dim",
                    )}
                  >
                    {option.voters === 0
                      ? "אף אחד עדיין"
                      : option.voters === 1
                        ? "איש אחד"
                        : `${option.voters} אנשים`}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <StickerLink href="/vote" accent="sun" size="md" tilt>
          <Glyph name="flame" strokeWidth={2.4} />
          לתת את האש שלכם
        </StickerLink>
        <p className="text-[13px] text-cream-dim">
          אפשר לשנות את ההצבעה כל עוד היא פתוחה.
        </p>
      </div>
    </section>
  );
}

function CutLine({ nights }: { nights: number }) {
  return (
    <div className="my-3 flex items-center gap-3" aria-hidden>
      <span className="h-[2px] flex-1 rounded-full bg-dust-blue/40" />
      <span className="font-display text-[11.5px] tracking-[0.16em] text-dust-blue">
        {nights} הערבים שנבשל · מתחת לקו עוד לא
      </span>
      <span className="h-[2px] flex-1 rounded-full bg-dust-blue/40" />
    </div>
  );
}
