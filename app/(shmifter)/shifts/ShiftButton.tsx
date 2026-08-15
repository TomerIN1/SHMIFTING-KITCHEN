"use client";

import { useActionState } from "react";
import { joinShift, leaveShift, type ShiftActionState } from "./actions";
import { StickerButton } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";

const EMPTY: ShiftActionState = {};

export function ShiftButton({
  shiftId,
  mine,
  full,
  locked,
}: {
  shiftId: string;
  mine: boolean;
  full: boolean;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(
    mine ? leaveShift : joinShift,
    EMPTY,
  );

  if (locked) {
    return (
      <p className="text-sm text-cream-dim">
        {mine ? "אתם במשמרת הזו" : "המטבח נעול"}
      </p>
    );
  }

  if (!mine && full) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-good">
        <Glyph name="check" strokeWidth={2.6} />
        מלאה
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="shiftId" value={shiftId} />
      <StickerButton
        type="submit"
        accent={mine ? "cream" : "sun"}
        variant={mine ? "quiet" : "solid"}
        size="sm"
        disabled={pending}
      >
        {pending ? "רגע…" : mine ? "לצאת מהמשמרת" : "אני בפנים"}
        {!pending && !mine && <Glyph name="plus" strokeWidth={2.8} />}
      </StickerButton>
      {state.error && (
        <span role="alert" className="text-xs font-medium text-alarm">
          {state.error}
        </span>
      )}
    </form>
  );
}
