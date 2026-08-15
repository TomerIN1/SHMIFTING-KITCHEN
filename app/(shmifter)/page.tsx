import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { getSettings, getUserWithProfile } from "@/lib/data/camp";
import { getRoundsForMember } from "@/lib/data/votes";
import { getMyShifts } from "@/lib/data/shifts";
import { getMenu, groupByDay } from "@/lib/data/menu";
import { buildMemberProgress } from "@/lib/data/readiness";
import { Wordmark } from "@/components/shmifting/Wordmark";
import { Countdown } from "@/components/shmifting/Countdown";
import { StickerLink } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";
import { PaperCard } from "@/components/shmifting/surfaces";
import { cn, hebrewDay, mealCount } from "@/lib/utils";
import { mealTypeLabel } from "@/lib/domain/categories";
import { HERO } from "@/components/shmifting/assets";
import { AmbientPoster } from "@/components/shmifting/AmbientPoster";


/* ============================================================================
   SHMIFTER HOME — Bible §9, Design Book §68 (The Home Test)

   Three questions, in this order, and nothing else:
     Where are we?        → the countdown, inside the world
     What have I done?    → three real tasks on a trail
     What should I do?    → exactly one primary action

   Design Book §29 is the rule this screen exists to prove: do not build a
   dashboard and decorate it. So the page opens as a poster — the illustration
   is the page, not a banner sitting above the page — and the interface grows
   out of it.
   ========================================================================= */

export default async function HomePage() {
  const user = await requireUser();
  const [camp, me, rounds, myShifts, menu] = await Promise.all([
    getSettings(),
    getUserWithProfile(user.id),
    getRoundsForMember(user.id),
    getMyShifts(user.id),
    getMenu(),
  ]);

  const openRounds = rounds.filter((r) => r.status === "open");
  const shiftsOpen =
    !camp.shiftsOpenAt || camp.shiftsOpenAt.getTime() <= Date.now();

  const progress = buildMemberProgress({
    profileComplete: Boolean(me?.profile?.completedAt),
    openRounds: openRounds.length,
    votedRounds: openRounds.filter((r) => r.hasVoted).length,
    shiftsOpen,
    myShiftCount: myShifts.length,
    quota: camp.shiftsPerPerson,
  });

  const menuRevealed = Boolean(camp.menuRevealedAt);
  const finalMeals = menu.filter((m) => m.status === "final");
  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <div className="space-y-10">
      {/* ---- THE POSTER ------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-[26px_32px_24px_30px] border-[3px] border-ink shadow-[6px_8px_0_0_var(--color-ink)]">
        <AmbientPoster name="hero-home" image={HERO.home} priority />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_18%,rgba(18,19,26,0.18),rgba(18,19,26,0.86)_72%)]"
        />

        <div className="relative flex flex-col items-center gap-6 px-5 py-10 text-center sm:px-10 sm:py-14">
          <Wordmark withTagline priority className="w-[min(74vw,430px)]" />

          <Countdown date={camp.departureDate} />

          <p className="max-w-md text-balance text-sm leading-relaxed text-cream-2 sm:text-base">
            {firstName}, אנחנו בונים את המטבח של {camp.campName} ביחד.
            <br className="hidden sm:block" />{" "}
            כל מה שתספרו לנו עכשיו — מישהו יאכל אותו במדבר.
          </p>
        </div>
      </section>

      {/* ---- THE ONE THING TO DO NOW ------------------------------------ */}
      <NextAction progress={progress} campLocked={Boolean(camp.lockedAt)} />

      {/* ---- WHY ANY OF THIS ---------------------------------------------- */}
      <HowThisWorks />

      {/* ---- THE TRAIL --------------------------------------------------- */}
      <section aria-labelledby="trail-heading">
        <h2
          id="trail-heading"
          className="mb-4 flex items-center gap-3 font-display text-xl text-cream"
        >
          <Glyph name="check" className="text-sun" strokeWidth={2.4} />
          מה כבר עשיתם
          <span className="text-sm font-normal text-cream-dim tabular-nums" dir="ltr">
            {progress.doneCount}/{progress.total}
          </span>
        </h2>

        <ul className="grid gap-3 sm:grid-cols-3">
          {progress.steps.map((step, i) => (
            <li key={step.key}>
              <Link
                href={step.href}
                className={cn(
                  "group flex h-full flex-col gap-2 rounded-[16px_20px_14px_18px] border-[2.5px] p-4",
                  "transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none",
                  step.done
                    ? "border-ink bg-cream text-ink shadow-[4px_5px_0_0_var(--color-ink)]"
                    : step.waiting
                      ? "border-charcoal-5 bg-charcoal-2 text-cream-dim"
                      : "border-ink bg-charcoal-3 text-cream shadow-[4px_5px_0_0_var(--color-ink)]",
                )}
                style={{ rotate: `${i % 2 === 0 ? -0.6 : 0.7}deg` }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-base">{step.label}</span>
                  <StepMark done={step.done} waiting={step.waiting} />
                </span>
                <span
                  className={cn(
                    "text-sm leading-snug",
                    step.done ? "text-ink/70" : "text-cream-2/85",
                    step.waiting && "text-cream-dim",
                  )}
                >
                  {step.detail}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- THE MENU, ONCE IT EXISTS ------------------------------------ */}
      {menuRevealed && finalMeals.length > 0 && (
        <MenuTeaser meals={finalMeals} />
      )}

      {/* ---- THE CAMP'S OWN WORDS ---------------------------------------- */}
      <footer className="pb-2 pt-4 text-center">
        <p className="mx-auto max-w-sm font-display text-lg leading-relaxed text-cream-2/70">
          אנחנו לא מחלקים דברים.
          <br />
          <span className="text-cream">אנחנו מחלקים רגעים.</span>
        </p>

        {/* Mixkit gives their music away and asks for nothing back. A camp
            whose whole premise is gifting says thank you out loud. Small,
            below the fold, and never competing with the camp's own line. */}
        <p className="mt-8 text-xs leading-relaxed text-cream-dim">
          מוזיקת הרקע באדיבות{" "}
          <a
            href="https://mixkit.co"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-cream-dim/50 underline-offset-4 transition-colors hover:text-sun hover:decoration-sun"
          >
            mixkit.co
          </a>
          , שמחלקים אותה בחינם. תודה.
        </p>
      </footer>
    </div>
  );
}

/* Three lines, because a member should not have to guess why a kitchen app is
   asking them about chickpeas. Bible §9 wants the Home to answer where are we,
   what have I done, what should I do — this answers the question underneath
   all three: what is this, and what happens to what I type. Kept to one
   sentence each; the moment it needs a fourth it has become a manual. */
function HowThisWorks() {
  const beats = [
    {
      k: "למה",
      accent: "text-shmift-pink",
      text: "כי אף אחד לא רוצה להיות זה ששואל ״מה אוכלים?״ ביום השלישי באבק.",
    },
    {
      k: "איך",
      accent: "text-sun",
      text: "אתם מספרים לנו מה אתם אוכלים, מצביעים למה שבא לכם, ותופסים ערב אחד במטבח.",
    },
    {
      k: "מה",
      accent: "text-lavender",
      text: "אנחנו הופכים את זה לתפריט, לרשימת קניות ולמשמרות — ואז מכבים את הטלפונים.",
    },
  ];

  return (
    <section
      aria-label="איך זה עובד"
      className="rounded-[18px_22px_16px_20px] border-2 border-charcoal-5 bg-charcoal-2 px-5 py-5 sm:px-6"
    >
      <ul className="space-y-3.5">
        {beats.map((beat) => (
          <li key={beat.k} className="flex items-baseline gap-3">
            <span
              className={cn(
                "w-9 shrink-0 font-display text-[15px] leading-none",
                beat.accent,
              )}
            >
              {beat.k}
            </span>
            <span className="text-sm leading-relaxed text-cream-2 sm:text-[15px]">
              {beat.text}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-charcoal-5 pt-3 text-[13px] leading-relaxed text-cream-dim">
        שתי דקות עכשיו. שבוע של אוכל טוב אחר כך. עסקה סבירה.
      </p>
    </section>
  );
}

function StepMark({ done, waiting }: { done: boolean; waiting: boolean }) {
  if (done) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-ink bg-good text-ink">
        <Glyph name="check" strokeWidth={3} label="הושלם" />
      </span>
    );
  }
  if (waiting) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-charcoal-5 text-cream-dim">
        <Glyph name="clock" strokeWidth={2} label="עוד לא נפתח" />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-ink bg-sun text-ink animate-breathe">
      <Glyph name="arrow" strokeWidth={2.6} label="מחכה לכם" />
    </span>
  );
}

/* The single obvious primary action (Bible §9). Presented as a sign somebody
   is holding out to you, not as a button in a toolbar. */
function NextAction({
  progress,
  campLocked,
}: {
  progress: ReturnType<typeof buildMemberProgress>;
  campLocked: boolean;
}) {
  if (campLocked) {
    return (
      <PaperCard accent="good" tilt={-0.8} className="px-5 py-6 sm:px-8">
        <p className="font-display text-sm tracking-[0.2em] text-terracotta">
          THE KITCHEN IS LOCKED
        </p>
        <p className="mt-2 font-display text-2xl text-ink sm:text-3xl">
          המטבח סגור. הכול מוכן.
        </p>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink/70">
          מכאן זה כבר לא קורה במסך. נתראה באבק — עם התפריט מודפס והמשמרות
          מסודרות.
        </p>
        <StickerLink href="/menu" accent="terracotta" size="lg" tilt className="mt-5">
          לראות את התפריט
        </StickerLink>
      </PaperCard>
    );
  }

  if (!progress.next) {
    return (
      <PaperCard accent="good" tilt={-0.8} className="px-5 py-6 sm:px-8">
        <p className="font-display text-sm tracking-[0.2em] text-good">
          ALL DONE
        </p>
        <p className="mt-2 font-display text-2xl text-ink sm:text-3xl">
          עשיתם את כל מה שביקשנו.
        </p>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink/70">
          המטבח יודע מה אתם אוכלים, מה בא לכם, ומתי אתם עוזרים. עכשיו תורנו
          לעבוד. נעדכן אתכם כשהתפריט ייסגר.
        </p>
      </PaperCard>
    );
  }

  const step = progress.next;

  return (
    <PaperCard
      accent="sun"
      tilt={-0.9}
      className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8"
    >
      <div className="min-w-0">
        <p className="font-display text-sm tracking-[0.2em] text-terracotta">
          מה עכשיו?
        </p>
        <p className="mt-1.5 font-display text-2xl leading-tight text-ink sm:text-3xl">
          {step.detail}
        </p>
        <p className="mt-1.5 text-sm text-ink/60">{step.label}</p>
      </div>
      <StickerLink
        href={step.href}
        accent="sun"
        size="lg"
        tilt
        className="shrink-0 self-start sm:self-auto"
      >
        {step.cta}
        <Glyph name="arrow" strokeWidth={2.4} />
      </StickerLink>
    </PaperCard>
  );
}

function MenuTeaser({ meals }: { meals: Awaited<ReturnType<typeof getMenu>> }) {
  const days = groupByDay(meals).slice(0, 3);

  return (
    <section aria-labelledby="menu-teaser">
      <h2
        id="menu-teaser"
        className="mb-4 flex items-center gap-3 font-display text-xl text-cream"
      >
        <Glyph name="star" className="text-terracotta" strokeWidth={2.2} />
        התפריט כבר קיים
        <span className="text-sm font-normal text-cream-dim">
          {mealCount(meals.length)}
        </span>
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {days.map((day) => (
          <div
            key={day.date.toISOString()}
            className="rounded-[16px_20px_14px_18px] border-2 border-charcoal-5 bg-charcoal-2 p-4"
          >
            <p className="font-display text-base text-sun">
              {hebrewDay(day.date)}
            </p>
            <ul className="mt-2 space-y-1.5">
              {day.items.map((meal) => (
                <li key={meal.id} className="text-sm text-cream-2">
                  <span className="text-cream-dim">
                    {mealTypeLabel(meal.mealType)}
                  </span>{" "}
                  · {meal.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <StickerLink href="/menu" accent="terracotta" tilt className="mt-4">
        לראות את כל התפריט
      </StickerLink>
    </section>
  );
}
