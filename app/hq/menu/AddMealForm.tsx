"use client";

import { useActionState, useState } from "react";
import { createMeal, type MenuState } from "./actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput, ToolSelect } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { MEAL_TYPES } from "@/lib/domain/categories";

const EMPTY: MenuState = {};

export function AddMealForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(createMeal, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ToolButton type="button" accent="sun" onClick={() => setOpen(true)}>
        <Glyph name="plus" strokeWidth={2.6} />
        ארוחה חדשה
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
      <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">תאריך</span>
          <ToolInput type="date" name="date" defaultValue={defaultDate} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">ארוחה</span>
          <ToolSelect name="mealType" defaultValue="dinner">
            {Object.entries(MEAL_TYPES).map(([key, v]) => (
              <option key={key} value={key}>
                {v.he}
              </option>
            ))}
          </ToolSelect>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">שם</span>
          <ToolInput name="title" placeholder="ליל הודו" required maxLength={80} />
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
