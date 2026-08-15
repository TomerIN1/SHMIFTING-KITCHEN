import Link from "next/link";
import { getReadiness } from "@/lib/data/readiness";
import { getSettings } from "@/lib/data/camp";
import { HqHeading, ProgressBar, ExceptionRow } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { Glyph } from "@/components/shmifting/Glyph";
import { LockKitchen, LockedState } from "./LockKitchen";
import { daysUntil } from "@/lib/domain/readiness";
import { hebrewFullDate, cn } from "@/lib/utils";

export const metadata = { title: "מוכנות — Kitchen HQ" };

/* ============================================================================
   READINESS — Bible §31, §32

   "This is not a meaningless gamification percentage. It represents actual
    operational completeness."

   Every line below is a countable piece of work with a link to the screen
   that finishes it. The percentage is a summary of those lines, never the
   other way round.
   ========================================================================= */

export default async function ReadinessPage() {
  const [readiness, camp] = await Promise.all([getReadiness(), getSettings()]);
  const days = daysUntil(camp.departureDate);
  const locked = Boolean(camp.lockedAt);

  return (
    <div className="space-y-6">
      <HqHeading
        title="מוכנות המטבח"
        lead={
          locked
            ? "המטבח נעול. מה שרשום כאן הוא מה שיוצא איתכם למדבר."
            : days >= 0
              ? `${days} ימים עד שיוצאים. זה מה שעוד לא סגור.`
              : "היציאה כבר הייתה. זה מה שנשאר פתוח."
        }
      />

      {/* The one number, with the work behind it immediately underneath. */}
      <div className="rounded-[16px_20px_14px_18px] border-2 border-charcoal-4 bg-charcoal-2 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12.5px] text-cream-dim">מוכנות כוללת</p>
            <p className="font-display text-5xl leading-none tabular-nums text-cream">
              {readiness.score}
              <span className="text-2xl text-cream-dim">%</span>
            </p>
          </div>
          <div className="text-end">
            {readiness.blockers.length > 0 ? (
              <p className="text-[13.5px] text-alarm">
                {readiness.blockers.length}{" "}
                {readiness.blockers.length === 1 ? "חוסם" : "חוסמים"} נעילה
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[13.5px] text-good">
                <Glyph name="check" strokeWidth={2.5} />
                אפשר לנעול את המטבח
              </p>
            )}
            {readiness.attention.length > 0 && (
              <p className="text-[12.5px] text-attention">
                {readiness.attention.length} דברים שכדאי לסגור
              </p>
            )}
          </div>
        </div>

        <ProgressBar
          done={readiness.score}
          total={100}
          tone={
            readiness.blockers.length > 0
              ? "alarm"
              : readiness.score >= 90
                ? "good"
                : "sun"
          }
          className="mt-4"
        />
      </div>

      {/* Bible §32: locking comes after seeing the blockers, never before. */}
      {locked ? (
        <LockedState
          lockedAt={hebrewFullDate(camp.lockedAt!)}
          lockedBy={camp.lockedBy}
        />
      ) : (
        <LockKitchen
          canLock={readiness.canLock}
          blockers={readiness.blockers.map((b) => ({
            label: b.label,
            detail: b.detail,
            href: b.href,
          }))}
          score={readiness.score}
        />
      )}

      {readiness.blockers.length > 0 && (
        <Panel title="מה חוסם נעילה" accent="pink">
          <ul className="space-y-2 p-3">
            {readiness.blockers.map((check) => (
              <ExceptionRow
                key={check.id}
                tone="alarm"
                title={check.label}
                detail={check.detail}
                href={check.href}
                cta="לטפל"
              />
            ))}
          </ul>
        </Panel>
      )}

      {readiness.attention.length > 0 && (
        <Panel title="לא חוסם, אבל שווה לסגור" accent="sun">
          <ul className="space-y-2 p-3">
            {readiness.attention.map((check) => (
              <ExceptionRow
                key={check.id}
                tone="attention"
                title={check.label}
                detail={check.detail}
                href={check.href}
                cta="לראות"
              />
            ))}
          </ul>
        </Panel>
      )}

      {/* Everything, area by area. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {readiness.areas.map((area) => (
          <Panel
            key={area.key}
            accent={
              area.status === "blocked"
                ? "pink"
                : area.status === "attention"
                  ? "sun"
                  : "good"
            }
            title={area.label}
            action={
              <span
                className={cn(
                  "text-[12.5px] tabular-nums",
                  area.status === "blocked"
                    ? "text-alarm"
                    : area.status === "attention"
                      ? "text-attention"
                      : "text-good",
                )}
              >
                {Math.round(area.score * 100)}%
              </span>
            }
          >
            <ul className="divide-y divide-charcoal-4">
              {area.checks.map((check) => (
                <li
                  key={check.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                      check.status === "done"
                        ? "border-good text-good"
                        : check.status === "blocked"
                          ? "border-alarm text-alarm"
                          : "border-attention text-attention",
                    )}
                  >
                    <Glyph
                      name={check.status === "done" ? "check" : "alert"}
                      strokeWidth={2.6}
                      className="text-[11px]"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] text-cream">
                      {check.label}
                    </span>
                    <span className="block text-[12.5px] text-cream-2/70">
                      {check.detail}
                    </span>
                  </span>

                  {check.total > 1 && (
                    <span
                      className="shrink-0 text-[12.5px] tabular-nums text-cream-dim"
                      dir="ltr"
                    >
                      {check.done}/{check.total}
                    </span>
                  )}

                  {check.href && check.status !== "done" && (
                    <Link
                      href={check.href}
                      className="shrink-0 text-[12px] text-cream-dim underline transition-colors hover:text-sun"
                    >
                      לטפל
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <p className="pb-4 text-center text-[13px] leading-relaxed text-cream-dim">
        השאלה האמיתית היא לא האחוז.
        <br />
        <span className="text-cream-2">
          היא האם אפשר לכבות עכשיו את כל הטלפונים ועדיין להריץ את המטבח הזה יפה.
        </span>
      </p>
    </div>
  );
}
