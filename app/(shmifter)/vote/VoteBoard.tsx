"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { castVote, type VoteState } from "./actions";
import { StickerButton } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";
import { OBJECT } from "@/components/shmifting/assets";
import { ACCENTS, type Accent } from "@/components/shmifting/accents";
import { cn } from "@/lib/utils";

/* ============================================================================
   THE FLAME BOARD — Design Book §38, §69

   "Give your fire to the food you want."

   §69 sets the target precisely: distinctive + obvious. So the mechanic is
   literally giving away objects you are holding. A row of flames sits at the
   top; you spend them onto concepts; the row empties as you give. Nothing is
   abstracted into a slider or a star rating, and nothing is hidden behind a
   metaphor you have to decode.

   "Do not turn voting into a slot machine" — so the only motion is a flame
   settling where it landed, and it respects prefers-reduced-motion.
   ========================================================================= */

export interface VoteOptionView {
  id: string;
  title: string;
  description: string | null;
  dishes: string | null;
  dietaryNote: string | null;
  accent: string;
  suggester?: { name: string } | null;
}

const EMPTY: VoteState = {};

export function VoteBoard({
  roundId,
  tokens,
  options,
  initial,
  disabled,
}: {
  roundId: string;
  tokens: number;
  options: VoteOptionView[];
  initial: Record<string, number>;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(castVote, EMPTY);
  const [allocation, setAllocation] = useState<Record<string, number>>(() =>
    Object.fromEntries(options.map((o) => [o.id, initial[o.id] ?? 0])),
  );
  const [dirty, setDirty] = useState(false);

  const spent = Object.values(allocation).reduce((a, b) => a + b, 0);
  const left = tokens - spent;

  const give = (optionId: string) => {
    if (left <= 0 || disabled) return;
    setAllocation((a) => ({ ...a, [optionId]: (a[optionId] ?? 0) + 1 }));
    setDirty(true);
  };

  const takeBack = (optionId: string) => {
    if (disabled) return;
    setAllocation((a) => ({
      ...a,
      [optionId]: Math.max(0, (a[optionId] ?? 0) - 1),
    }));
    setDirty(true);
  };

  const reset = () => {
    setAllocation(Object.fromEntries(options.map((o) => [o.id, 0])));
    setDirty(true);
  };

  return (
    <form action={action} className="space-y-6">
      <input
        type="hidden"
        name="payload"
        value={JSON.stringify({ roundId, allocation })}
      />

      {/* ---- The flames you are still holding ---------------------------- */}
      <div className="sticky top-[74px] z-30 rounded-[16px_20px_14px_18px] border-[2.5px] border-ink bg-charcoal-2/95 px-4 py-3 shadow-[4px_5px_0_0_var(--color-ink)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1"
              role="img"
              aria-label={`נשארו לכם ${left} מתוך ${tokens} להבות`}
            >
              {Array.from({ length: tokens }).map((_, i) => (
                <Image
                  key={i}
                  src={i < left ? OBJECT.flameLit : OBJECT.flameUnlit}
                  alt=""
                  className={cn(
                    "h-9 w-9 object-contain transition-all duration-300 motion-reduce:transition-none",
                    i < left
                      ? "animate-flicker"
                      : "scale-90 opacity-35 grayscale",
                  )}
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              ))}
            </span>
            <span className="font-display text-base text-cream">
              {left > 0
                ? `נשארו לכם ${left === 1 ? "להבה אחת" : `${left} להבות`}`
                : "חילקתם את כל האש"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {spent > 0 && !disabled && (
              <button
                type="button"
                onClick={reset}
                className="rounded-[8px_10px_7px_9px] border-2 border-charcoal-5 px-2.5 py-1.5 text-xs text-cream-dim transition-colors hover:border-alarm hover:text-alarm"
              >
                להתחיל מחדש
              </button>
            )}
            {!disabled && (
              <StickerButton
                type="submit"
                accent={state.ok && !dirty ? "good" : "sun"}
                size="sm"
                disabled={pending || spent === 0}
              >
                {pending
                  ? "שולחים…"
                  : state.ok && !dirty
                    ? "ההצבעה נשמרה"
                    : "לשלוח את ההצבעה"}
              </StickerButton>
            )}
          </div>
        </div>

        {state.error && (
          <p
            role="alert"
            className="mt-2 flex items-center gap-1.5 text-sm font-medium text-alarm"
          >
            <Glyph name="alert" strokeWidth={2.4} />
            {state.error}
          </p>
        )}
      </div>

      {/* ---- The concepts ------------------------------------------------- */}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {options.map((option, i) => (
          <ConceptCard
            key={option.id}
            option={option}
            given={allocation[option.id] ?? 0}
            canGive={left > 0 && !disabled}
            disabled={Boolean(disabled)}
            onGive={() => give(option.id)}
            onTakeBack={() => takeBack(option.id)}
            tilt={i % 2 === 0 ? -0.8 : 0.9}
          />
        ))}
      </ul>
    </form>
  );
}

function ConceptCard({
  option,
  given,
  canGive,
  disabled,
  onGive,
  onTakeBack,
  tilt,
}: {
  option: VoteOptionView;
  given: number;
  canGive: boolean;
  disabled: boolean;
  onGive: () => void;
  onTakeBack: () => void;
  tilt: number;
}) {
  const accent = ACCENTS[(option.accent as Accent) in ACCENTS ? (option.accent as Accent) : "pink"];
  const dishes = (option.dishes ?? "").split("\n").filter(Boolean);

  return (
    <li>
      <div
        style={{ rotate: `${tilt}deg` }}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[20px_26px_18px_24px] border-[3px] border-ink",
          "shm-paper shadow-[5px_6px_0_0_var(--color-ink)]",
          "transition-transform duration-200 motion-reduce:transition-none",
          given > 0 && "-translate-y-1",
        )}
      >
        {/* A coloured plate the concept sits on. */}
        <div
          className={cn(
            "relative border-b-[3px] border-ink px-4 py-3",
            accent.bg,
          )}
        >
          <h3 className="font-display text-xl leading-tight text-ink">
            {option.title}
          </h3>
          {option.dietaryNote && (
            <p className="mt-0.5 text-[12.5px] text-ink/70">
              {option.dietaryNote}
            </p>
          )}
          {/* Credit by name. An idea with a person attached is worth more than
              an anonymous line, and it is also the only moderation this needs. */}
          {option.suggester && (
            <p className="mt-1 text-[12px] text-ink/55">
              הרעיון של {option.suggester.name}
            </p>
          )}

          {/* Flames that have already landed here. */}
          {given > 0 && (
            <span
              className="absolute -bottom-4 start-4 flex gap-0.5"
              role="img"
              aria-label={`נתתם ${given} להבות`}
            >
              {Array.from({ length: given }).map((_, i) => (
                <Image
                  key={i}
                  src={OBJECT.flameLit}
                  alt=""
                  className="h-8 w-8 animate-flicker object-contain drop-shadow-[2px_2px_0_rgba(11,12,16,0.55)]"
                  style={{ animationDelay: `${i * 0.35}s` }}
                />
              ))}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-6">
          {option.description && (
            <p className="text-sm leading-relaxed text-ink/80">
              {option.description}
            </p>
          )}

          {dishes.length > 0 && (
            <ul className="space-y-1">
              {dishes.map((dish) => (
                <li
                  key={dish}
                  className="flex items-start gap-1.5 text-[13px] text-ink/70"
                >
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/45" />
                  {dish}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto flex items-center gap-2 pt-2">
            {disabled ? (
              <p className="text-sm font-medium text-ink/55">
                {given > 0 ? `נתתם ${given}` : "לא נתתם אש"}
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onGive}
                  disabled={!canGive}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-[12px_15px_11px_14px] border-[2.5px] border-ink px-3 py-2.5",
                    "font-display text-[15px] transition-all duration-150",
                    "shadow-[3px_3px_0_0_var(--color-ink)] hover:shadow-[1px_1px_0_0_var(--color-ink)]",
                    "hover:translate-x-[-1px] hover:translate-y-[2px]",
                    "disabled:pointer-events-none disabled:opacity-35",
                    accent.bg,
                    "text-ink",
                  )}
                >
                  <Image
                    src={OBJECT.flameLit}
                    alt=""
                    className="h-6 w-6 object-contain"
                  />
                  לתת אש
                </button>

                <button
                  type="button"
                  onClick={onTakeBack}
                  disabled={given === 0}
                  aria-label={`לקחת בחזרה להבה מ${option.title}`}
                  className="flex h-[46px] w-11 items-center justify-center rounded-[10px_12px_9px_11px] border-[2.5px] border-ink bg-cream-3 text-ink transition-colors hover:bg-cream-dim disabled:opacity-30"
                >
                  <Glyph name="minus" strokeWidth={2.8} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
