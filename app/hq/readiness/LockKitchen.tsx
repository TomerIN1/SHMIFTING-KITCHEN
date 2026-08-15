"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { lockKitchen, unlockKitchen, type LockState } from "./actions";
import { StickerButton, ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { HERO } from "@/components/shmifting/assets";

const EMPTY: LockState = {};

/* ============================================================================
   LOCK THE KITCHEN — Bible §32, Design Book §71

   "This moment can be more theatrical than normal Admin actions. It represents
    the transition from planning to living."

   The only place in Kitchen HQ that is allowed to be a poster. Everything
   else here is a tool; this is a milestone.

   Bible §32 also insists the system must not encourage locking while critical
   work remains — so the blockers are named, in full, before the button
   appears, and locking anyway is an explicit second act.
   ========================================================================= */

export function LockKitchen({
  canLock,
  blockers,
  score,
}: {
  canLock: boolean;
  blockers: { label: string; detail: string; href?: string }[];
  score: number;
}) {
  const [state, action, pending] = useActionState(lockKitchen, EMPTY);

  return (
    <section className="relative overflow-hidden rounded-[22px_28px_20px_26px] border-[3px] border-ink shadow-[5px_6px_0_0_var(--color-ink)]">
      <Image
        src={HERO.locked}
        alt=""
        placeholder="blur"
        className="absolute inset-0 h-full w-full object-cover"
        sizes="(max-width: 1024px) 100vw, 1100px"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(115%_100%_at_50%_35%,rgba(18,19,26,0.45),rgba(18,19,26,0.93)_72%)]"
      />

      <div className="relative px-5 py-9 text-center sm:px-10 sm:py-12">
        <p className="font-display text-[11px] tracking-[0.32em] text-sun">
          THE FINAL STEP
        </p>
        <h2 className="shm-poster mx-auto mt-2 max-w-lg text-3xl leading-tight text-cream sm:text-4xl">
          LOCK THE KITCHEN
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream-2">
          אחרי הנעילה שלב התכנון נגמר. התוכנית נשמרת, המשמרות ננעלות, וכל מה
          שנשאר הוא להדפיס ולצאת לדרך.
        </p>

        {canLock ? (
          <form action={action} className="mt-6">
            <input type="hidden" name="confirmed" value={state.needsConfirm ? "1" : "0"} />
            {state.needsConfirm ? (
              <div className="mx-auto max-w-md space-y-3">
                <p className="text-sm font-medium text-sun">
                  זהו. בטוחים?
                </p>
                <StickerButton
                  type="submit"
                  accent="terracotta"
                  size="lg"
                  tilt
                  disabled={pending}
                >
                  {pending ? "נועלים…" : "כן. לנעול את המטבח."}
                  <Glyph name="lock" strokeWidth={2.4} />
                </StickerButton>
              </div>
            ) : (
              <StickerButton
                type="submit"
                accent="sun"
                size="lg"
                tilt
                disabled={pending}
              >
                לנעול את המטבח
                <Glyph name="lock" strokeWidth={2.4} />
              </StickerButton>
            )}
          </form>
        ) : (
          <div className="mx-auto mt-6 max-w-lg rounded-md border-2 border-alarm/60 bg-alarm/[0.1] p-4 text-start">
            <p className="flex items-center gap-2 font-display text-[15px] text-alarm">
              <Glyph name="alert" strokeWidth={2.4} />
              עוד אי אפשר לנעול — {blockers.length}{" "}
              {blockers.length === 1 ? "דבר חוסם" : "דברים חוסמים"}
            </p>
            <ul className="mt-2 space-y-1">
              {blockers.map((b, i) => (
                <li key={i} className="text-[13px] text-cream-2">
                  · {b.detail}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[12.5px] text-cream-2/70">
              מוכנות נוכחית: {score}%. אלה דברים שבאמת משפיעים על מה שיקרה
              במדבר — לא ניקוד.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */

export function LockedState({
  lockedAt,
  lockedBy,
}: {
  lockedAt: string;
  lockedBy: string | null;
}) {
  const [state, action, pending] = useActionState(unlockKitchen, EMPTY);
  const [unlocking, setUnlocking] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-[22px_28px_20px_26px] border-[3px] border-ink shadow-[5px_6px_0_0_var(--color-ink)]">
      <Image
        src={HERO.locked}
        alt=""
        placeholder="blur"
        className="absolute inset-0 h-full w-full object-cover"
        sizes="(max-width: 1024px) 100vw, 1100px"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(115%_100%_at_50%_35%,rgba(18,19,26,0.4),rgba(18,19,26,0.9)_72%)]"
      />

      <div className="relative px-5 py-10 text-center sm:px-10 sm:py-14">
        <h2 className="shm-poster mx-auto max-w-lg text-3xl leading-tight text-cream sm:text-4xl">
          THE KITCHEN IS LOCKED.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream-2">
          התכנון נגמר ב־{lockedAt}
          {lockedBy && ` על ידי ${lockedBy}`}. מכאן זה כבר לא קורה במסך.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <StickerButton accent="terracotta" size="lg" tilt>
            <a href="/hq/pack" className="flex items-center gap-2">
              <Glyph name="print" strokeWidth={2.2} />
              להדפיס את חבילת המטבח
            </a>
          </StickerButton>
        </div>

        <div className="mt-8 border-t-2 border-charcoal-4/60 pt-5">
          {unlocking ? (
            <form
              action={action}
              className="mx-auto flex max-w-sm flex-col items-center gap-2"
            >
              <p className="text-[13px] text-cream-2">
                כדי לפתוח, הקלידו: <strong>לפתוח את המטבח</strong>
              </p>
              <ToolInput name="phrase" className="text-center" autoFocus />
              <div className="flex gap-2">
                <ToolButton
                  type="submit"
                  disabled={pending}
                  className="border-alarm/60 text-alarm hover:border-alarm"
                >
                  {pending ? "פותחים…" : "לפתוח מחדש"}
                </ToolButton>
                <ToolButton type="button" onClick={() => setUnlocking(false)}>
                  ביטול
                </ToolButton>
              </div>
              {state.error && (
                <p role="alert" className="text-[12.5px] text-alarm">
                  {state.error}
                </p>
              )}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setUnlocking(true)}
              className="text-[12.5px] text-cream-dim underline transition-colors hover:text-cream"
            >
              צריך לשנות משהו דחוף? לפתוח את המטבח
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
