"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addRecipeItem,
  updateRecipeItem,
  clearItemOverride,
  deleteRecipeItem,
  type RecipeState,
} from "../actions";
import { Td, Tr } from "@/components/hq/primitives";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput, ToolSelect } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { UNITS, unitLabel, formatQuantity } from "@/lib/domain/units";
import { CATEGORIES } from "@/lib/domain/categories";
import { allergenLabel } from "@/lib/domain/allergens";
import { money, cn } from "@/lib/utils";
import type { ScaledItem } from "@/lib/domain/scaling";

const EMPTY: RecipeState = {};

/* ============================================================================
   ONE INGREDIENT LINE — Bible §19, §23

   Three numbers live side by side and none of them is hidden:

     base       what the recipe says for one batch
     ×factor    what the maths produces
     final      what the kitchen will actually buy

   When the Kitchen Lead types over the last one, the calculated value stays
   visible next to it. That is the whole point: the system shows its work, the
   human makes the call, and either can be checked against the other later.
   ========================================================================= */

export function ItemRow({
  item,
  currency,
  locked,
}: {
  item: ScaledItem;
  currency: string;
  locked: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [, start] = useTransition();

  if (editing) {
    return (
      <Tr>
        <Td className="!p-2" colSpan={6}>
          <form
            action={async (fd) => {
              await updateRecipeItem(fd);
              setEditing(false);
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="id" value={item.id} />
            <span className="min-w-[8rem] font-medium text-cream">
              {item.ingredientName}
            </span>
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-cream-dim">
                כמות לבסיס
              </span>
              <ToolInput
                name="quantity"
                type="number"
                step="0.01"
                min="0"
                defaultValue={item.quantity}
                className="w-24"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-cream-dim">
                יחידה
              </span>
              <ToolSelect name="unit" defaultValue={item.unit} className="w-28">
                {UNITS.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.he}
                  </option>
                ))}
              </ToolSelect>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-cream-dim">
                כמות סופית לקמפ (עוקף חישוב)
              </span>
              <ToolInput
                name="scaledOverride"
                type="number"
                step="0.01"
                min="0"
                defaultValue={item.scaledOverride ?? ""}
                placeholder={String(formatQuantity(item.practical))}
                className="w-40"
              />
            </label>
            <label className="block flex-1">
              <span className="mb-1 block text-[11.5px] text-cream-dim">
                הערה
              </span>
              <ToolInput name="note" defaultValue={item.note ?? ""} maxLength={120} />
            </label>
            <ToolButton type="submit" accent="sun" active>
              לשמור
            </ToolButton>
            <ToolButton type="button" onClick={() => setEditing(false)}>
              ביטול
            </ToolButton>
          </form>
        </Td>
      </Tr>
    );
  }

  return (
    <Tr>
      <Td>
        <span className="font-medium text-cream">{item.ingredientName}</span>
        {item.note && (
          <span className="ms-2 text-[12px] text-cream-dim">{item.note}</span>
        )}
        {item.allergens && item.allergens.length > 0 && (
          <span className="ms-2 inline-flex gap-1">
            {item.allergens.map((a) => (
              <span
                key={a}
                className="rounded border border-attention/50 px-1 text-[11px] text-attention"
              >
                {allergenLabel(a)}
              </span>
            ))}
          </span>
        )}
      </Td>

      <Td numeric className="text-cream-dim">
        {formatQuantity(item.quantity)} {unitLabel(item.unit)}
      </Td>

      <Td numeric className="text-cream-dim">
        <span title="מה שהחישוב אומר">{formatQuantity(item.raw)}</span>
      </Td>

      <Td numeric>
        <span
          className={cn(
            "font-display text-[15px]",
            item.isOverridden ? "text-lavender" : "text-cream",
          )}
          title={
            item.isOverridden
              ? `החישוב אמר ${formatQuantity(item.practical)} — נקבע ידנית`
              : "מעוגל לכמות שאפשר באמת לקנות"
          }
        >
          {formatQuantity(item.final)} {unitLabel(item.unit)}
        </span>
        {item.isOverridden && (
          <span className="ms-1.5 text-[11px] text-lavender">ידני</span>
        )}
      </Td>

      <Td numeric className="text-cream-dim">
        {money(item.lineCost, currency)}
      </Td>

      <Td numeric>
        {!locked && (
          <span className="flex items-center justify-end gap-1">
            {item.isOverridden && (
              <form
                action={(fd) => start(() => clearItemOverride(fd).then(() => {}))}
              >
                <input type="hidden" name="id" value={item.id} />
                <ToolButton
                  type="submit"
                  aria-label="לחזור לכמות המחושבת"
                  title="לחזור לכמות המחושבת"
                >
                  <Glyph name="arrow" strokeWidth={2.2} />
                </ToolButton>
              </form>
            )}
            <ToolButton
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`לערוך ${item.ingredientName}`}
            >
              <Glyph name="pencil" strokeWidth={2.2} />
            </ToolButton>
            <form action={(fd) => start(() => deleteRecipeItem(fd).then(() => {}))}>
              <input type="hidden" name="id" value={item.id} />
              <ToolButton
                type="submit"
                className="hover:border-alarm hover:text-alarm"
                aria-label={`להסיר ${item.ingredientName}`}
              >
                <Glyph name="cross" strokeWidth={2.4} />
              </ToolButton>
            </form>
          </span>
        )}
      </Td>
    </Tr>
  );
}

/* ------------------------------------------------------------------------- */

export function AddItemForm({
  recipeId,
  knownIngredients,
}: {
  recipeId: string;
  knownIngredients: { name: string; defaultUnit: string; category: string }[];
}) {
  const [state, action, pending] = useActionState(addRecipeItem, EMPTY);

  return (
    <form
      action={async (fd) => {
        await action(fd);
      }}
      className="flex flex-wrap items-end gap-2 border-t-2 border-charcoal-4 p-3"
    >
      <input type="hidden" name="recipeId" value={recipeId} />

      <label className="block min-w-[12rem] flex-1">
        <span className="mb-1 block text-[11.5px] text-cream-dim">מרכיב</span>
        <ToolInput
          name="ingredient"
          list="known-ingredients"
          placeholder="עגבניות"
          required
          maxLength={60}
          autoComplete="off"
        />
        {/* Reuse before invention (Bible §20) — typing an existing name links
            to the existing ingredient instead of creating a duplicate. */}
        <datalist id="known-ingredients">
          {knownIngredients.map((i) => (
            <option key={i.name} value={i.name} />
          ))}
        </datalist>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] text-cream-dim">כמות</span>
        <ToolInput
          name="quantity"
          type="number"
          step="0.01"
          min="0"
          required
          className="w-24"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] text-cream-dim">יחידה</span>
        <ToolSelect name="unit" defaultValue="kg" className="w-28">
          {UNITS.map((u) => (
            <option key={u.key} value={u.key}>
              {u.he}
            </option>
          ))}
        </ToolSelect>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] text-cream-dim">
          קטגוריה (למרכיב חדש)
        </span>
        <ToolSelect name="category" defaultValue="produce" className="w-36">
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.he}
            </option>
          ))}
        </ToolSelect>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] text-cream-dim">
          מחיר ליחידה
        </span>
        <ToolInput
          name="cost"
          type="number"
          step="0.01"
          min="0"
          placeholder="0"
          className="w-24"
        />
      </label>

      <ToolButton type="submit" accent="sun" active disabled={pending}>
        {pending ? "מוסיפים…" : "להוסיף מרכיב"}
      </ToolButton>

      {state.error && (
        <p role="alert" className="w-full text-[13px] text-alarm">
          {state.error}
        </p>
      )}
    </form>
  );
}
