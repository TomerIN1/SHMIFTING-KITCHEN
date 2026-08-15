"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { addDish, updateDish, deleteDish, type MenuState } from "../actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import {
  ToolInput,
  ToolSelect,
  ToolTextArea,
} from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { StatusChip } from "@/components/shmifting/Status";
import { DISH_ROLES } from "@/lib/domain/categories";
import { ALLERGENS, DIETARY_PATTERNS, allergenLabel } from "@/lib/domain/allergens";
import { cn } from "@/lib/utils";

const EMPTY: MenuState = {};

export interface DishView {
  id: string;
  name: string;
  role: string;
  dietary: string;
  allergens: string[];
  notes: string | null;
  recipeId: string | null;
  recipeName: string | null;
  /* Allergens the recipe's ingredients bring in — shown but never editable
     here, because the recipe is where they actually come from. */
  ingredientAllergens: string[];
}

export function DishList({
  mealId,
  dishes,
  locked,
}: {
  mealId: string;
  dishes: DishView[];
  locked: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {dishes.length === 0 && (
        <p className="rounded border-2 border-dashed border-charcoal-5 p-4 text-center text-sm text-cream-dim">
          אין עדיין מנות בארוחה הזו. בלי מנות אין מה לאכול, ואי אפשר לחשב כלום.
        </p>
      )}

      {dishes.map((dish) => (
        <DishRow key={dish.id} dish={dish} locked={locked} />
      ))}

      {!locked && <AddDish mealId={mealId} />}
    </div>
  );
}

function DishRow({ dish, locked }: { dish: DishView; locked: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  const derived = dish.ingredientAllergens.filter(
    (a) => !dish.allergens.includes(a),
  );

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateDish(fd);
          setEditing(false);
        }}
        className="rounded-[13px_16px_12px_15px] border-2 border-sun/50 bg-charcoal-2 p-3.5"
      >
        <input type="hidden" name="id" value={dish.id} />
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto_auto]">
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">שם המנה</span>
            <ToolInput name="name" defaultValue={dish.name} required maxLength={80} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">תפקיד</span>
            <ToolSelect name="role" defaultValue={dish.role}>
              {Object.entries(DISH_ROLES).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.he}
                </option>
              ))}
            </ToolSelect>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">תזונה</span>
            <ToolSelect name="dietary" defaultValue={dish.dietary}>
              {Object.entries(DIETARY_PATTERNS).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.short}
                </option>
              ))}
            </ToolSelect>
          </label>
        </div>

        <fieldset className="mt-3">
          <legend className="mb-1.5 text-[12px] text-cream-dim">
            אלרגנים במנה הזו (מעבר למה שמגיע מהמתכון)
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.filter((a) => a.key !== "other").map((a) => (
              <label
                key={a.key}
                className="cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  name="allergens"
                  value={a.key}
                  defaultChecked={dish.allergens.includes(a.key)}
                  className="peer sr-only"
                />
                <span className="block rounded border-2 border-charcoal-5 px-2 py-0.5 text-[12.5px] text-cream-2 transition-colors peer-checked:border-alarm peer-checked:bg-alarm/15 peer-checked:text-alarm peer-focus-visible:ring-2 peer-focus-visible:ring-sun">
                  {a.he}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-3 block">
          <span className="mb-1 block text-[12px] text-cream-dim">הערות</span>
          <ToolTextArea name="notes" defaultValue={dish.notes ?? ""} maxLength={400} />
        </label>

        <div className="mt-3 flex items-center gap-2">
          <ToolButton type="submit" accent="sun" active>
            לשמור
          </ToolButton>
          <ToolButton type="button" onClick={() => setEditing(false)}>
            ביטול
          </ToolButton>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-display text-[16px] text-cream">{dish.name}</h4>
          <span className="rounded border border-charcoal-5 px-1.5 py-0.5 text-[11.5px] text-cream-dim">
            {DISH_ROLES[dish.role as keyof typeof DISH_ROLES]?.he ?? dish.role}
          </span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[11.5px]",
              dish.dietary === "vegan"
                ? "border-good/60 text-good"
                : dish.dietary === "vegetarian"
                  ? "border-good/40 text-good/85"
                  : "border-charcoal-5 text-cream-dim",
            )}
          >
            {DIETARY_PATTERNS[dish.dietary as keyof typeof DIETARY_PATTERNS]?.short}
          </span>
        </div>

        {(dish.allergens.length > 0 || derived.length > 0) && (
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {dish.allergens.map((a) => (
              <li
                key={a}
                className="rounded border border-alarm/60 bg-alarm/10 px-1.5 py-0.5 text-[11.5px] text-alarm"
              >
                {allergenLabel(a)}
              </li>
            ))}
            {derived.map((a) => (
              <li
                key={a}
                className="rounded border border-attention/50 px-1.5 py-0.5 text-[11.5px] text-attention"
                title="מגיע מרכיב במתכון"
              >
                {allergenLabel(a)} · מהמתכון
              </li>
            ))}
          </ul>
        )}

        {dish.notes && (
          <p className="mt-1.5 text-[13px] text-cream-2/70">{dish.notes}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {dish.recipeId ? (
          <Link
            href={`/hq/recipes/${dish.recipeId}`}
            className="flex items-center gap-1.5 rounded-[9px_11px_8px_10px] border-2 border-charcoal-5 px-2.5 py-1.5 text-[12.5px] text-cream-2 transition-colors hover:border-sun hover:text-sun"
          >
            <Glyph name="pot" strokeWidth={2} />
            מתכון
          </Link>
        ) : (
          <StatusChip tone="attention" size="sm">
            אין מתכון
          </StatusChip>
        )}

        {!locked && (
          <>
            <ToolButton type="button" onClick={() => setEditing(true)}>
              <Glyph name="pencil" strokeWidth={2.2} />
            </ToolButton>
            <form
              action={async (fd) => {
                start(async () => {
                  await deleteDish(fd);
                });
              }}
            >
              <input type="hidden" name="id" value={dish.id} />
              <ToolButton
                type="submit"
                disabled={pending}
                className="hover:border-alarm hover:text-alarm"
                aria-label={`למחוק את ${dish.name}`}
              >
                <Glyph name="cross" strokeWidth={2.4} />
              </ToolButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function AddDish({ mealId }: { mealId: string }) {
  const [state, action, pending] = useActionState(addDish, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ToolButton type="button" accent="sun" onClick={() => setOpen(true)}>
        <Glyph name="plus" strokeWidth={2.6} />
        להוסיף מנה
      </ToolButton>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
      }}
      className="rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-3"
    >
      <input type="hidden" name="mealId" value={mealId} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">שם המנה</span>
          <ToolInput name="name" placeholder="קארי עדשים ובטטה" required maxLength={80} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">תפקיד</span>
          <ToolSelect name="role" defaultValue="main">
            {Object.entries(DISH_ROLES).map(([key, v]) => (
              <option key={key} value={key}>
                {v.he}
              </option>
            ))}
          </ToolSelect>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">תזונה</span>
          <ToolSelect name="dietary" defaultValue="omnivore">
            {Object.entries(DIETARY_PATTERNS).map(([key, v]) => (
              <option key={key} value={key}>
                {v.short}
              </option>
            ))}
          </ToolSelect>
        </label>
        <div className="flex items-end gap-2">
          <ToolButton type="submit" accent="sun" active disabled={pending}>
            {pending ? "מוסיפים…" : "להוסיף"}
          </ToolButton>
          <ToolButton type="button" onClick={() => setOpen(false)}>
            ביטול
          </ToolButton>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-[13px] text-alarm">
          {state.error}
        </p>
      )}
    </form>
  );
}
