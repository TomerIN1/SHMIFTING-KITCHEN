"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { suggestOption, type SuggestState } from "./actions";
import { Field, TextInput, TextArea } from "@/components/shmifting/Field";
import { StickerButton } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";

/* ============================================================================
   SUGGEST AN IDEA — Bible §12

   "Voting should feel like a camp activity, not a survey."

   A survey is a list somebody else wrote. This is the one control that makes
   the board the camp's rather than the Kitchen Lead's: if you know exactly
   what the desert needs on Wednesday, you put it up yourself.

   It stays folded away until asked for. Open by default, it would compete
   with the flames for attention, and spending your flames is the thing almost
   everybody came here to do.
   ========================================================================= */

const EMPTY: SuggestState = {};

export function SuggestIdea({ roundId }: { roundId: string }) {
  const [state, action, pending] = useActionState(suggestOption, EMPTY);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /* Clear the form on success so a second idea does not start half-written,
     and fold it away so the board comes back into view. */
  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    const timer = setTimeout(() => setOpen(false), 1800);
    return () => clearTimeout(timer);
  }, [state]);

  if (!open) {
    return (
      <div className="flex flex-col items-center gap-2 pt-2">
        <StickerButton
          type="button"
          accent="lavender"
          size="md"
          tilt
          onClick={() => setOpen(true)}
        >
          <Glyph name="plus" strokeWidth={2.6} />
          יש לי רעיון
        </StickerButton>
        {state.ok && (
          <p role="status" className="text-[13px] text-good">
            הרעיון עלה ללוח. תודה.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-[18px_22px_16px_20px] border-2 border-lavender/60 bg-charcoal-2 px-5 py-5"
    >
      <input type="hidden" name="roundId" value={roundId} />

      <p className="mb-1 font-display text-lg text-cream">מה בא לכם לאכול?</p>
      <p className="mb-4 text-[13px] leading-relaxed text-cream-2/80">
        כתבו מנה עיקרית שאתם רוצים לראות במדבר. היא תעלה ללוח על שמכם, וכולם
        יוכלו לתת לה אש.
      </p>

      <div className="space-y-3">
        <Field label="המנה" htmlFor="s-title">
          <TextInput
            id="s-title"
            name="title"
            required
            maxLength={80}
            placeholder="שקשוקה ענקית במחבת אחת"
          />
        </Field>

        <Field label="עוד משהו?" htmlFor="s-desc" optional>
          <TextArea
            id="s-desc"
            name="description"
            maxLength={300}
            placeholder="מה מגיע עם זה, למה דווקא את זה, איך סבתא הכינה…"
          />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className="mt-3 text-[13px] text-alarm">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <StickerButton
          type="submit"
          accent="lavender"
          size="md"
          tilt
          disabled={pending}
        >
          {pending ? "מעלים…" : "להעלות ללוח"}
        </StickerButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[13px] text-cream-dim underline underline-offset-4 hover:text-cream"
        >
          לא עכשיו
        </button>
      </div>
    </form>
  );
}
