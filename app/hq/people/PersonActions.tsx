"use client";

import { useActionState, useState, useTransition } from "react";
import {
  setNotComing,
  setComing,
  removePerson,
  type PeopleState,
} from "./actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";

const EMPTY: PeopleState = {};

export interface RemovalCost {
  voteCount: number;
  closedRoundVotes: number;
  shiftCount: number;
  shoppingCount: number;
  allergyCount: number;
}

/* ============================================================================
   REMOVING SOMEBODY FROM THE CAMP

   The safe action is the visible one. Deleting is a second step, behind a
   disclosure, and it states exactly what will be lost before it offers the
   button — Bible §40 asks for prevention over recovery, and there is no
   recovery here.
   ========================================================================= */

export function PersonActions({
  userId,
  name,
  notComing,
  isSelf,
  isLastAdmin,
  cost,
}: {
  userId: string;
  name: string;
  notComing: boolean;
  isSelf: boolean;
  isLastAdmin: boolean;
  cost: RemovalCost;
}) {
  const [, start] = useTransition();
  const [state, action, pending] = useActionState(removePerson, EMPTY);
  const [showDelete, setShowDelete] = useState(false);

  if (isSelf) {
    return (
      <span className="text-[12px] text-cream-dim">אתם</span>
    );
  }

  if (notComing) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <form action={(fd) => start(() => setComing(fd).then(() => {}))}>
          <input type="hidden" name="userId" value={userId} />
          <ToolButton
            type="submit"
            className="border-good/60 text-good hover:border-good"
          >
            <Glyph name="check" strokeWidth={2.5} />
            בעצם כן מגיע.ה
          </ToolButton>
        </form>
        <DeleteControl
          userId={userId}
          name={name}
          cost={cost}
          isLastAdmin={isLastAdmin}
          open={showDelete}
          setOpen={setShowDelete}
          state={state}
          action={action}
          pending={pending}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={(fd) => start(() => setNotComing(fd).then(() => {}))}>
        <input type="hidden" name="userId" value={userId} />
        <ToolButton
          type="submit"
          className="hover:border-attention hover:text-attention"
          title={`${name} לא מגיע.ה — להוציא מכל החישובים של המטבח`}
        >
          לא מגיע.ה
        </ToolButton>
      </form>
      <DeleteControl
        userId={userId}
        name={name}
        cost={cost}
        isLastAdmin={isLastAdmin}
        open={showDelete}
        setOpen={setShowDelete}
        state={state}
        action={action}
        pending={pending}
      />
    </div>
  );
}

function DeleteControl({
  userId,
  name,
  cost,
  isLastAdmin,
  open,
  setOpen,
  state,
  action,
  pending,
}: {
  userId: string;
  name: string;
  cost: RemovalCost;
  isLastAdmin: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  state: PeopleState;
  action: (fd: FormData) => void;
  pending: boolean;
}) {
  if (isLastAdmin) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] text-cream-dim underline transition-colors hover:text-alarm"
      >
        למחוק לגמרי
      </button>
    );
  }

  const losses: string[] = [];

  if (cost.voteCount > 0) {
    const votes =
      cost.voteCount === 1 ? "הצבעה אחת" : `${cost.voteCount} הצבעות`;
    losses.push(
      cost.closedRoundVotes > 0
        ? `${votes} — ${
            cost.closedRoundVotes === 1
              ? "אחת מהן בסבב שכבר נסגר, והתוצאה שלו תשתנה"
              : `${cost.closedRoundVotes} מהן בסבבים שכבר נסגרו, והתוצאות שלהם ישתנו`
          }`
        : votes,
    );
  }
  if (cost.allergyCount > 0) {
    losses.push(
      cost.allergyCount === 1
        ? "אלרגיה אחת שדווחה"
        : `${cost.allergyCount} אלרגיות שדווחו`,
    );
  }
  if (cost.shiftCount > 0) {
    losses.push(
      cost.shiftCount === 1 ? "משמרת אחת" : `${cost.shiftCount} משמרות`,
    );
  }
  if (cost.shoppingCount > 0) {
    losses.push(
      cost.shoppingCount === 1
        ? "פריט קנייה אחד שהם אחראים עליו"
        : `${cost.shoppingCount} פריטי קנייה שהם אחראים עליהם`,
    );
  }

  return (
    <form
      action={action}
      className="w-full rounded-md border-2 border-alarm border-s-[6px] border-s-alarm bg-alarm/[0.08] p-3 text-start"
    >
      <input type="hidden" name="userId" value={userId} />

      <p className="flex items-center gap-2 font-display text-[14px] text-alarm">
        <Glyph name="alert" strokeWidth={2.4} />
        למחוק את {name} לגמרי?
      </p>

      {losses.length > 0 ? (
        <>
          <p className="mt-1.5 text-[12.5px] text-cream-2">
            זה ימחק גם:
          </p>
          <ul className="mt-1 space-y-0.5">
            {losses.map((l) => (
              <li key={l} className="text-[12.5px] text-cream-2/85">
                · {l}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1.5 text-[12.5px] text-cream-2/85">
          אין להם שום נתונים במערכת. אפשר למחוק בשקט.
        </p>
      )}

      {cost.closedRoundVotes > 0 && (
        <p className="mt-2 text-[12.5px] font-medium text-attention">
          אם הם פשוט לא מגיעים — עדיף &quot;לא מגיע.ה&quot;. זה מוציא אותם מכל
          חישובי המטבח ומשאיר את ההצבעות שהתפריט נבחר לפיהן.
        </p>
      )}

      <label className="mt-2.5 block">
        <span className="mb-1 block text-[12px] text-cream-dim">
          להקליד את השם כדי לאשר: <strong className="text-cream">{name}</strong>
        </span>
        <ToolInput name="confirmName" autoComplete="off" className="max-w-xs" />
      </label>

      <div className="mt-2 flex items-center gap-2">
        <ToolButton
          type="submit"
          disabled={pending}
          className="border-alarm text-alarm hover:bg-alarm/15"
        >
          {pending ? "מוחקים…" : "למחוק לצמיתות"}
        </ToolButton>
        <ToolButton type="button" onClick={() => setOpen(false)}>
          ביטול
        </ToolButton>
      </div>

      {state.error && (
        <p role="alert" className="mt-2 text-[12.5px] text-alarm">
          {state.error}
        </p>
      )}
    </form>
  );
}
