"use client";

import { useActionState, useTransition } from "react";
import { updateMeal, deleteMeal, recordVoteOverride, type MenuState } from "../actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import {
  ToolInput,
  ToolSelect,
  ToolTextArea,
} from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { MEAL_TYPES } from "@/lib/domain/categories";
import { useState } from "react";

const EMPTY: MenuState = {};

export function MealSettings({
  meal,
  campDiners,
  locked,
}: {
  meal: {
    id: string;
    title: string;
    concept: string | null;
    notes: string | null;
    mealType: string;
    date: string;
    expectedDiners: number | null;
    overrideReason: string | null;
  };
  campDiners: number;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(updateMeal, EMPTY);
  const [deleting, setDeleting] = useState(false);
  const [_, startDelete] = useTransition();

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={meal.id} />

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              שם הארוחה
            </span>
            <ToolInput
              name="title"
              defaultValue={meal.title}
              required
              maxLength={80}
              disabled={locked}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">תאריך</span>
            <ToolInput
              type="date"
              name="date"
              defaultValue={meal.date}
              disabled={locked}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">סוג</span>
            <ToolSelect
              name="mealType"
              defaultValue={meal.mealType}
              disabled={locked}
            >
              {Object.entries(MEAL_TYPES).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.he}
                </option>
              ))}
            </ToolSelect>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            הרעיון מאחורי הארוחה
          </span>
          <ToolTextArea
            name="concept"
            defaultValue={meal.concept ?? ""}
            maxLength={400}
            placeholder="קארי שמתבשל מהצהריים…"
            disabled={locked}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              כמה סועדים
            </span>
            <ToolInput
              type="number"
              name="expectedDiners"
              min={0}
              defaultValue={meal.expectedDiners ?? ""}
              placeholder={`ברירת מחדל: ${campDiners}`}
              disabled={locked}
            />
            <span className="mt-1 block text-[11.5px] text-cream-dim">
              השאירו ריק כדי להשתמש במספר של כל הקמפ. זה מה שמכפיל את המתכונים.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              הערות למטבח
            </span>
            <ToolTextArea
              name="notes"
              defaultValue={meal.notes ?? ""}
              maxLength={400}
              placeholder="להתחיל לבשל ב-14:00…"
              disabled={locked}
            />
          </label>
        </div>

        {!locked && (
          <div className="flex items-center gap-3">
            <ToolButton type="submit" accent="sun" active disabled={pending}>
              {pending ? "שומרים…" : "לשמור שינויים"}
            </ToolButton>
            {state.ok && (
              <span className="flex items-center gap-1.5 text-[13px] text-good">
                <Glyph name="check" strokeWidth={2.6} />
                נשמר
              </span>
            )}
            {state.error && (
              <span role="alert" className="text-[13px] text-alarm">
                {state.error}
              </span>
            )}
          </div>
        )}
      </form>

      {/* Bible §13/§23: departing from the vote is allowed and should be
          recorded honestly, not hidden. */}
      {!locked && (
        <form
          action={recordVoteOverride}
          className="rounded border-2 border-charcoal-4 bg-charcoal-3 p-3"
        >
          <input type="hidden" name="id" value={meal.id} />
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              אם החלטתם אחרת מההצבעה — למה?
            </span>
            <ToolInput
              name="reason"
              defaultValue={meal.overrideReason ?? ""}
              maxLength={200}
              placeholder="הקארי יצא זול יותר וגם פותר את הטבעונים"
            />
          </label>
          <ToolButton type="submit" className="mt-2">
            לשמור את הסיבה
          </ToolButton>
        </form>
      )}

      {!locked && (
        <div className="border-t-2 border-charcoal-4 pt-3">
          {deleting ? (
            <form
              action={(fd) => startDelete(() => deleteMeal(fd).then(() => {}))}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="id" value={meal.id} />
              <span className="text-[13px] text-alarm">
                למחוק את הארוחה ואת כל המנות והמתכונים שלה?
              </span>
              <ToolButton
                type="submit"
                className="border-alarm text-alarm hover:bg-alarm/15"
              >
                כן, למחוק
              </ToolButton>
              <ToolButton type="button" onClick={() => setDeleting(false)}>
                ביטול
              </ToolButton>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="text-[12.5px] text-cream-dim underline transition-colors hover:text-alarm"
            >
              למחוק את הארוחה
            </button>
          )}
        </div>
      )}
    </div>
  );
}
