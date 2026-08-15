"use client";

import { useActionState, useState } from "react";
import { reviewAllergy, unreviewAllergy, type ReviewState } from "./actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";

const EMPTY: ReviewState = {};

export function ReviewForm({
  id,
  reviewed,
  note,
}: {
  id: string;
  reviewed: boolean;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(reviewAllergy, EMPTY);
  const [undoState, undoAction, undoPending] = useActionState(
    unreviewAllergy,
    EMPTY,
  );
  const [open, setOpen] = useState(false);

  if (reviewed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-good">
          <Glyph name="check" strokeWidth={2.6} />
          נבדק
        </span>
        {note && (
          <span className="text-[12.5px] text-cream-dim">“{note}”</span>
        )}
        <form action={undoAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={undoPending}
            className="text-[12px] text-cream-dim underline transition-colors hover:text-attention"
          >
            לפתוח מחדש
          </button>
        </form>
        {undoState.error && (
          <span className="text-[12px] text-alarm">{undoState.error}</span>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <ToolButton
        type="button"
        accent="good"
        onClick={() => setOpen(true)}
        className="border-good/60 text-good hover:border-good"
      >
        <Glyph name="check" strokeWidth={2.6} />
        לסמן כנבדק
      </ToolButton>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <ToolInput
        name="note"
        placeholder="איך תטפלו בזה? (לא חובה)"
        className="min-w-[16rem] flex-1"
        maxLength={200}
        autoFocus
      />
      <ToolButton type="submit" accent="good" active disabled={pending}>
        {pending ? "שומרים…" : "אישור"}
      </ToolButton>
      <ToolButton type="button" onClick={() => setOpen(false)}>
        ביטול
      </ToolButton>
      {state.error && (
        <span className="text-[12px] text-alarm">{state.error}</span>
      )}
    </form>
  );
}
