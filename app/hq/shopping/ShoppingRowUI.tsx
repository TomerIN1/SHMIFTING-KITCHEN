"use client";

import { useActionState, useState, useTransition } from "react";
import {
  setItemStatus,
  setItemAssignee,
  setItemNumbers,
  addManualItem,
  deleteManualItem,
  type ShoppingState,
} from "./actions";
import { Td, Tr } from "@/components/hq/primitives";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput, ToolSelect } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { unitLabel, formatQuantity, UNITS } from "@/lib/domain/units";
import { CATEGORIES } from "@/lib/domain/categories";
import { money, cn } from "@/lib/utils";
import type { ShoppingRow } from "@/lib/domain/shopping";

const EMPTY: ShoppingState = {};

const STATUSES = [
  { key: "needed", he: "צריך", cls: "bg-charcoal-5 text-cream" },
  { key: "assigned", he: "משובץ", cls: "bg-attention text-ink" },
  { key: "bought", he: "נקנה", cls: "bg-good text-ink" },
] as const;

/* ============================================================================
   ONE SHOPPING LINE — Bible §26, §28

   Design Book §45: "Individual shopping rows should remain highly efficient.
   The Kitchen Lead may need to scan dozens of them."

   So the row is a table row, not a card, and the three things that change
   most often — status, who is buying, what it really cost — are editable in
   place without opening anything.
   ========================================================================= */

export function ShoppingItemRow({
  row,
  people,
  currency,
  locked,
}: {
  row: ShoppingRow;
  people: { id: string; name: string }[];
  currency: string;
  locked: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, start] = useTransition();
  const [state, action, pending] = useActionState(setItemNumbers, EMPTY);

  const identity = (
    <>
      <input type="hidden" name="rowId" value={row.id ?? ""} />
      <input type="hidden" name="ingredientId" value={row.ingredientId ?? ""} />
    </>
  );

  return (
    <>
      <Tr>
        <Td>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-start font-medium text-cream transition-colors hover:text-sun"
            aria-expanded={expanded}
          >
            <Glyph
              name="chevron"
              strokeWidth={2.4}
              className={cn(
                "text-[11px] text-cream-dim transition-transform",
                expanded && "-rotate-90",
              )}
            />
            {row.name}
          </button>
          {row.isManual && (
            <span className="ms-2 text-[11px] text-cream-dim">ידני</span>
          )}
          {row.notes && (
            <span className="ms-2 text-[12px] text-cream-dim">{row.notes}</span>
          )}
        </Td>

        <Td numeric>
          <span
            className={cn(
              "font-display",
              row.isOverridden ? "text-lavender" : "text-cream",
            )}
            title={
              row.isOverridden
                ? `החישוב אמר ${formatQuantity(row.derivedQuantity)} ${unitLabel(row.unit)}`
                : undefined
            }
          >
            {formatQuantity(row.finalQuantity)} {unitLabel(row.unit)}
          </span>
          {row.extras.length > 0 && (
            <span className="block text-[11.5px] text-cream-dim">
              + {row.extras.map((e) => `${formatQuantity(e.quantity)} ${unitLabel(e.unit)}`).join(", ")}
            </span>
          )}
        </Td>

        <Td numeric className="text-cream-dim">
          {money(row.estimatedCost, currency)}
        </Td>

        <Td numeric>
          {row.actualCost !== null ? (
            <span
              className={cn(
                row.actualCost > row.estimatedCost ? "text-attention" : "text-good",
              )}
            >
              {money(row.actualCost, currency)}
            </span>
          ) : (
            <span className="text-charcoal-5">—</span>
          )}
        </Td>

        <Td>
          {locked ? (
            <span className="text-[13px] text-cream-2">
              {row.assigneeName ?? "—"}
            </span>
          ) : (
            <form action={(fd) => start(() => setItemAssignee(fd).then(() => {}))}>
              {identity}
              <ToolSelect
                name="assigneeId"
                defaultValue={row.assigneeId ?? ""}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="min-w-[8rem] max-w-[11rem]"
                aria-label={`מי אחראי על ${row.name}`}
              >
                <option value="">—</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </ToolSelect>
            </form>
          )}
        </Td>

        <Td>
          <div
            role="group"
            aria-label={`מצב ${row.name}`}
            className="inline-flex overflow-hidden rounded-[8px_10px_7px_9px] border-2 border-charcoal-5"
          >
            {STATUSES.map((s) => {
              const active = s.key === row.status;
              return (
                <form
                  key={s.key}
                  action={(fd) => start(() => setItemStatus(fd).then(() => {}))}
                >
                  {identity}
                  <input type="hidden" name="status" value={s.key} />
                  <button
                    type="submit"
                    disabled={locked || active}
                    aria-pressed={active}
                    className={cn(
                      "px-2 py-1 text-[12px] font-medium transition-colors",
                      active
                        ? s.cls
                        : "text-cream-dim hover:bg-charcoal-3 hover:text-cream",
                      locked && "cursor-not-allowed",
                    )}
                  >
                    {s.he}
                  </button>
                </form>
              );
            })}
          </div>
        </Td>
      </Tr>

      {expanded && (
        <Tr className="bg-charcoal-3/50">
          <Td colSpan={6} className="!py-3">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Where the number came from (Bible §26). */}
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-cream-dim">
                  מאיפה הכמות הזו
                </p>
                {row.sources.length === 0 ? (
                  <p className="text-[13px] text-cream-2/75">
                    פריט ידני — לא נגזר משום מתכון.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {row.sources.map((s, i) => (
                      <li
                        key={`${s.mealId}-${i}`}
                        className="flex items-baseline justify-between gap-3 text-[13px]"
                      >
                        <span className="text-cream-2">
                          {s.recipeName}
                          <span className="ms-1.5 text-cream-dim">
                            {s.mealTitle} · {s.servings} מנות
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-cream-dim">
                          {formatQuantity(s.quantity)} {unitLabel(s.unit)}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-baseline justify-between gap-3 border-t-2 border-charcoal-4 pt-1 text-[13px] font-medium">
                      <span className="text-cream">סה״כ מחושב</span>
                      <span className="tabular-nums text-cream">
                        {formatQuantity(row.derivedQuantity)}{" "}
                        {unitLabel(row.unit)}
                      </span>
                    </li>
                  </ul>
                )}
              </div>

              {/* What the human decided. */}
              {!locked && (
                <form action={action} className="space-y-2">
                  {identity}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] text-cream-dim">
                        {row.isManual ? "כמות" : "כמות סופית (עוקף)"}
                      </span>
                      <ToolInput
                        name={row.isManual ? "manualQuantity" : "quantityOverride"}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={
                          row.isManual
                            ? row.finalQuantity
                            : row.isOverridden
                              ? row.finalQuantity
                              : ""
                        }
                        placeholder={formatQuantity(row.derivedQuantity)}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] text-cream-dim">
                        כמה זה עלה באמת
                      </span>
                      <ToolInput
                        name="actualCost"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={row.actualCost ?? ""}
                        placeholder={String(Math.round(row.estimatedCost))}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] text-cream-dim">
                        הערה
                      </span>
                      <ToolInput
                        name="notes"
                        defaultValue={row.notes ?? ""}
                        maxLength={120}
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <ToolButton type="submit" accent="sun" active disabled={pending}>
                      {pending ? "שומרים…" : "לשמור"}
                    </ToolButton>
                    {state.ok && (
                      <span className="text-[12.5px] text-good">נשמר</span>
                    )}
                    {state.error && (
                      <span className="text-[12.5px] text-alarm">
                        {state.error}
                      </span>
                    )}
                    {row.isManual && row.id && (
                      <form
                        action={(fd) =>
                          start(() => deleteManualItem(fd).then(() => {}))
                        }
                        className="ms-auto"
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <ToolButton
                          type="submit"
                          className="hover:border-alarm hover:text-alarm"
                        >
                          למחוק פריט
                        </ToolButton>
                      </form>
                    )}
                  </div>
                </form>
              )}
            </div>
          </Td>
        </Tr>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------- */

export function AddManualItemForm() {
  const [state, action, pending] = useActionState(addManualItem, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ToolButton type="button" accent="sun" onClick={() => setOpen(true)}>
        <Glyph name="plus" strokeWidth={2.6} />
        פריט שלא מגיע ממתכון
      </ToolButton>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
      }}
      className="w-full rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-3"
    >
      <p className="mb-2 text-[12.5px] text-cream-2/75">
        נייר סופג, שקיות זבל, נייר אלומיניום, כפפות — כל מה שהמטבח צריך ואף
        מתכון לא מבקש.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto]">
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">פריט</span>
          <ToolInput name="name" placeholder="נייר סופג" required maxLength={60} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">כמות</span>
          <ToolInput
            name="quantity"
            type="number"
            step="0.01"
            min="0"
            required
            className="w-20"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">יחידה</span>
          <ToolSelect name="unit" defaultValue="unit" className="w-28">
            {UNITS.map((u) => (
              <option key={u.key} value={u.key}>
                {u.he}
              </option>
            ))}
          </ToolSelect>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">קטגוריה</span>
          <ToolSelect name="category" defaultValue="supplies" className="w-36">
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.he}
              </option>
            ))}
          </ToolSelect>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">מחיר ליחידה</span>
          <ToolInput name="cost" type="number" step="0.01" min="0" className="w-24" />
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
