import Image from "next/image";
import { requireUser } from "@/lib/auth/guard";
import { getShifts, type ShiftRow } from "@/lib/data/shifts";
import { getSettings } from "@/lib/data/camp";
import { ShiftButton } from "./ShiftButton";
import { EmptyState } from "@/components/shmifting/EmptyState";
import { StatusChip, Capacity } from "@/components/shmifting/Status";
import { Glyph } from "@/components/shmifting/Glyph";
import { HERO, MEAL_ART } from "@/components/shmifting/assets";
import { groupByDay } from "@/lib/data/menu";
import { hebrewDay, hebrewDate, cn } from "@/lib/utils";
import { shiftTypeLabel } from "@/lib/domain/categories";

export const metadata = { title: "משמרות — SHMIFTING KITCHEN" };

/* ============================================================================
   KITCHEN SHIFTS — Bible §21, §22, Design Book §39

   "Understaffed shifts should visually request help. Full shifts should feel
    satisfying."

   So an understaffed shift wears an amber edge and says how many people it is
   short, in words; a full shift goes quiet and cream. Capacity is always shown
   as `3 / 4` because §39 says that number matters more than cleverness.
   ========================================================================= */

export default async function ShiftsPage() {
  const user = await requireUser();
  const [allShifts, camp] = await Promise.all([getShifts(), getSettings()]);

  const notOpenYet =
    camp.shiftsOpenAt && camp.shiftsOpenAt.getTime() > Date.now();
  const locked = Boolean(camp.lockedAt);

  const mine = allShifts.filter((s) =>
    s.assignments.some((a) => a.userId === user.id),
  );
  const days = groupByDay(allShifts);
  const stillNeeded = Math.max(0, camp.shiftsPerPerson - mine.length);

  return (
    <div className="space-y-9">
      <section className="relative overflow-hidden rounded-[24px_30px_22px_28px] border-[3px] border-ink shadow-[5px_6px_0_0_var(--color-ink)]">
        <Image
          src={HERO.shifts}
          alt=""
          priority
          placeholder="blur"
          className="absolute inset-0 h-full w-full object-cover"
          sizes="(max-width: 1024px) 100vw, 1100px"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_100%_at_45%_30%,rgba(18,19,26,0.25),rgba(18,19,26,0.9)_74%)]"
        />
        <div className="relative px-5 py-10 sm:px-9 sm:py-12">
          <p className="font-display text-xs tracking-[0.24em] text-dust-blue">
            ביחד, כל הזמן
          </p>
          <h1 className="shm-poster mt-2 max-w-lg text-3xl leading-tight text-cream sm:text-4xl">
            מישהו צריך לבשל את זה.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-cream-2 sm:text-base">
            {/* An invitation, not a quota. Nobody owes the camp a shift, and a
                screen that counts what you still "must" do makes the nicest
                few hours of the week sound like homework. */}
            {locked
              ? "המשמרות סגורות. מה שרשום כאן — זה מה שיהיה."
              : stillNeeded > 0
                ? "מוזמנים להצטרף אלינו למטבח למשמרת. מוזיקה, שוטים, ואווירת מטבח פתוח מובטחת."
                : "אתם בפנים — תודה. ואם בא לכם עוד ערב במטבח, תמיד יש מקום."}
          </p>
        </div>
      </section>

      {/* Why there is nothing to sign up for before the evening. Without this
          the board reads as half-built — five dinners and no explanation of
          where breakfast and lunch went. */}
      <div className="flex items-start gap-3 rounded-[15px_18px_13px_17px] border-2 border-charcoal-5 bg-charcoal-2 px-4 py-3.5">
        <Glyph name="sun" className="mt-0.5 shrink-0 text-sun" strokeWidth={2} />
        <p className="text-sm leading-relaxed text-cream-2">
          <span className="font-medium text-cream">בוקר וצהריים — מטבח פתוח.</span>{" "}
          אין משמרות ואף אחד לא מבשל לכולם. יש קפה, יש מה למרוח, וכל אחד.ת עושה
          לעצמו.ה משהו מתי שמתחשק. המשמרות כאן הן רק לארוחות הערב — קחו כמה
          שבא לכם.
        </p>
      </div>

      {allShifts.length === 0 ? (
        <EmptyState title="עוד לא נקבעו משמרות">
          מנהל.ת המטבח עוד לא בנה.תה את לוח המשמרות. כשזה יקרה תוכלו לבחור מתי
          אתם במטבח.
        </EmptyState>
      ) : notOpenYet ? (
        <EmptyState title="בחירת המשמרות עוד לא נפתחה">
          הלוח כבר קיים, אבל עוד סגור לבחירה. נעדכן אתכם ברגע שאפשר יהיה לתפוס
          מקום.
        </EmptyState>
      ) : (
        <>
          {mine.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl text-cream">
                <Glyph name="check" className="text-good" strokeWidth={2.4} />
                המשמרות שלכם
              </h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {mine.map((shift) => (
                  <li
                    key={shift.id}
                    className="flex items-center gap-3 rounded-[14px_17px_12px_16px] border-[2.5px] border-ink shm-paper px-4 py-3 shadow-[4px_5px_0_0_var(--color-ink)]"
                  >
                    <Image
                      src={MEAL_ART[shift.mealType]}
                      alt=""
                      className="h-10 w-10 shrink-0 object-contain"
                    />
                    <div className="min-w-0">
                      <p className="font-display text-[15px] text-ink">
                        {shiftTypeLabel(shift.mealType)} · {hebrewDay(shift.date)}
                      </p>
                      <p className="text-[13px] text-ink/60" dir="ltr">
                        {shift.startTime}–{shift.endTime}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-6">
            {days.map(({ date, items }) => (
              <div key={date.toISOString()}>
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 className="font-display text-xl text-cream">
                    {hebrewDay(date)}
                  </h2>
                  <span className="text-sm text-cream-dim">
                    {hebrewDate(date)}
                  </span>
                  <span
                    aria-hidden
                    className="h-[3px] flex-1 rounded-full bg-dust-blue/35"
                  />
                </div>

                <ul className="space-y-2.5">
                  {items.map((shift) => (
                    <ShiftRowItem
                      key={shift.id}
                      shift={shift}
                      userId={user.id}
                      locked={locked}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function ShiftRowItem({
  shift,
  userId,
  locked,
}: {
  shift: ShiftRow;
  userId: string;
  locked: boolean;
}) {
  const mine = shift.assignments.some((a) => a.userId === userId);
  const needsHelp = shift.missing > 0;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[16px_20px_14px_18px] border-[2.5px] px-4 py-3.5",
        mine
          ? "border-ink shm-paper shadow-[4px_5px_0_0_var(--color-ink)]"
          : needsHelp
            ? "border-attention/70 bg-attention/[0.07]"
            : "border-charcoal-5 bg-charcoal-2",
      )}
    >
      <Image
        src={MEAL_ART[shift.mealType]}
        alt=""
        className={cn(
          "h-12 w-12 shrink-0 object-contain",
          !mine && !needsHelp && "opacity-70",
        )}
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-display text-[17px] leading-tight",
            mine ? "text-ink" : "text-cream",
          )}
        >
          {shift.label || shiftTypeLabel(shift.mealType)}
          {shift.meal && (
            <span
              className={cn(
                "ms-2 text-[13px] font-normal",
                mine ? "text-ink/60" : "text-cream-dim",
              )}
            >
              {shift.meal.title}
            </span>
          )}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[13px] tabular-nums",
            mine ? "text-ink/60" : "text-cream-2/70",
          )}
          dir="ltr"
        >
          {shift.startTime}–{shift.endTime}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-end">
          <Capacity filled={shift.filled} required={shift.requiredPeople} />
          <p
            className={cn(
              "text-[12px]",
              mine ? "text-ink/55" : "text-cream-dim",
            )}
          >
            {needsHelp
              ? shift.missing === 1
                ? "חסר עוד אחד"
                : `חסרים ${shift.missing}`
              : "מאוישת"}
          </p>
        </div>

        {mine && <StatusChip tone="done" size="sm">אתם כאן</StatusChip>}

        <ShiftButton
          shiftId={shift.id}
          mine={mine}
          full={shift.isFull}
          locked={locked}
        />
      </div>

      {/* Bible §34: who else is on this shift is useful and social — but only
          names, never anybody's dietary or allergy information. */}
      {shift.assignments.length > 0 && (
        <ul className="flex w-full flex-wrap gap-1.5 border-t-2 border-dashed border-current/15 pt-2.5">
          {shift.assignments.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[12px]",
                mine
                  ? "border-ink/25 text-ink/70"
                  : "border-charcoal-5 text-cream-2/75",
              )}
            >
              {a.user.name}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
