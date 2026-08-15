"use client";

import { useActionState, useState, useTransition } from "react";
import { updateRecipe, deleteRecipe, type RecipeState } from "../actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import {
  ToolInput,
  ToolTextArea,
} from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";

const EMPTY: RecipeState = {};

export function RecipeSettings({
  recipe,
  locked,
}: {
  recipe: {
    id: string;
    name: string;
    baseServings: number;
    instructions: string | null;
    notes: string | null;
  };
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(updateRecipe, EMPTY);
  const [deleting, setDeleting] = useState(false);
  const [, startDelete] = useTransition();

  if (locked) {
    return (
      <div className="space-y-3">
        {recipe.instructions ? (
          <ol className="space-y-2">
            {recipe.instructions
              .split("\n")
              .filter(Boolean)
              .map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-cream-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-charcoal-5 text-[12px] tabular-nums text-cream-dim">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
          </ol>
        ) : (
          <p className="text-sm text-cream-dim">לא נכתבו הוראות הכנה.</p>
        )}
        {recipe.notes && (
          <p className="rounded border-2 border-charcoal-4 bg-charcoal-3 p-2.5 text-[13px] text-cream-2">
            {recipe.notes}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={recipe.id} />

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              שם המתכון
            </span>
            <ToolInput name="name" defaultValue={recipe.name} required maxLength={90} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              המתכון כתוב ל־
            </span>
            <ToolInput
              type="number"
              name="baseServings"
              min={1}
              defaultValue={recipe.baseServings}
              className="w-28"
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            הוראות הכנה — שורה לכל שלב
          </span>
          <ToolTextArea
            name="instructions"
            defaultValue={recipe.instructions ?? ""}
            className="min-h-40 leading-relaxed"
            placeholder={"מטגנים בצל ושום עד זהוב.\nמוסיפים תבלינים, מערבבים חצי דקה.\nמוסיפים עדשים ומים ומבשלים 40 דקות."}
          />
          <span className="mt-1 block text-[11.5px] text-cream-dim">
            כל שורה תודפס כשלב ממוספר בחבילת המטבח.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            הערות למי שמבשל
          </span>
          <ToolTextArea
            name="notes"
            defaultValue={recipe.notes ?? ""}
            maxLength={400}
            placeholder="להשרות את הגרגרים לילה קודם. זה לא אופציונלי."
          />
        </label>

        <div className="flex items-center gap-3">
          <ToolButton type="submit" accent="sun" active disabled={pending}>
            {pending ? "שומרים…" : "לשמור"}
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
      </form>

      <div className="border-t-2 border-charcoal-4 pt-3">
        {deleting ? (
          <form
            action={(fd) => startDelete(() => deleteRecipe(fd).then(() => {}))}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="id" value={recipe.id} />
            <span className="text-[13px] text-alarm">
              למחוק את המתכון? המנה תישאר, בלי כמויות.
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
            למחוק את המתכון
          </button>
        )}
      </div>
    </div>
  );
}
