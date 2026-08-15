"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createShift,
  updateShift,
  deleteShift,
  assignToShift,
  removeAssignment,
  generateShifts,
  type ShiftAdminState,
} from "./actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput, ToolSelect } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { Capacity } from "@/components/shmifting/Status";
import { SHIFT_TYPES, shiftTypeLabel } from "@/lib/domain/categories";
import { cn } from "@/lib/utils";

const EMPTY: ShiftAdminState = {};

export interface ShiftView {
  id: string;
  date: string;
  mealType: string;
  label: string | null;
  startTime: string;
  endTime: string;
  requiredPeople: number;
  notes: string | null;
  filled: number;
  missing: number;
  assignments: { id: string; userId: string; name: string; source: string }[];
}

/* ============================================================================
   SHIFT ADMINISTRATION — Bible §22, §23
   Assign, reassign, remove — with the gap always in view.
   ========================================================================= */

export function ShiftCard({
  shift,
  people,
  locked,
}: {
  shift: ShiftView;
  people: { id: string; name: string }[];
  locked: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(assignToShift, EMPTY);
  const [, start] = useTransition();

  const assignedIds = new Set(shift.assignments.map((a) => a.userId));
  const available = people.filter((p) => !assignedIds.has(p.id));

  return (
    <div
      className={cn(
        "rounded-[13px_16px_12px_15px] border-2 p-3.5",
        shift.filled === 0
          ? "border-alarm/55 bg-alarm/[0.06]"
          : shift.missing > 0
            ? "border-attention/50 bg-attention/[0.05]"
            : "border-charcoal-4 bg-charcoal-2",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] text-cream">
            {shift.label || shiftTypeLabel(shift.mealType)}
          </p>
          <p className="text-[12.5px] tabular-nums text-cream-dim" dir="ltr">
            {shift.startTime}–{shift.endTime}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-end">
            <Capacity filled={shift.filled} required={shift.requiredPeople} />
            <p className="text-[11.5px] text-cream-dim">
              {shift.missing > 0 ? `חסרים ${shift.missing}` : "מאויש"}
            </p>
          </div>
          {!locked && (
            <>
              <ToolButton
                type="button"
                onClick={() => setEditing((v) => !v)}
                aria-label="לערוך את המשמרת"
              >
                <Glyph name="pencil" strokeWidth={2.2} />
              </ToolButton>
              <form action={(fd) => start(() => deleteShift(fd).then(() => {}))}>
                <input type="hidden" name="id" value={shift.id} />
                <ToolButton
                  type="submit"
                  className="hover:border-alarm hover:text-alarm"
                  aria-label="למחוק את המשמרת"
                >
                  <Glyph name="cross" strokeWidth={2.4} />
                </ToolButton>
              </form>
            </>
          )}
        </div>
      </div>

      {editing && !locked && (
        <form
          action={async (fd) => {
            await updateShift(fd);
            setEditing(false);
          }}
          className="mt-3 grid gap-2 border-t-2 border-charcoal-4 pt-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
        >
          <input type="hidden" name="id" value={shift.id} />
          <label className="block">
            <span className="mb-1 block text-[11.5px] text-cream-dim">כותרת</span>
            <ToolInput
              name="label"
              defaultValue={shift.label ?? ""}
              placeholder={shiftTypeLabel(shift.mealType)}
              maxLength={60}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] text-cream-dim">התחלה</span>
            <ToolInput type="time" name="startTime" defaultValue={shift.startTime} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] text-cream-dim">סיום</span>
            <ToolInput type="time" name="endTime" defaultValue={shift.endTime} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] text-cream-dim">כמה אנשים</span>
            <ToolInput
              type="number"
              name="requiredPeople"
              min={1}
              defaultValue={shift.requiredPeople}
              className="w-20"
            />
          </label>
          <div className="flex items-end gap-2">
            <ToolButton type="submit" accent="sun" active>
              לשמור
            </ToolButton>
          </div>
        </form>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {shift.assignments.map((a) => (
          <li key={a.id}>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[12.5px]",
                a.source === "lead"
                  ? "border-lavender/60 text-lavender"
                  : "border-charcoal-5 text-cream-2",
              )}
              title={a.source === "lead" ? "שובץ.ה על ידכם" : "בחר.ה בעצמו.ה"}
            >
              {a.name}
              {!locked && (
                <form
                  action={(fd) => start(() => removeAssignment(fd).then(() => {}))}
                  className="inline"
                >
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    aria-label={`להוציא את ${a.name} מהמשמרת`}
                    className="opacity-50 transition-opacity hover:opacity-100"
                  >
                    <Glyph name="cross" strokeWidth={3} className="text-[10px]" />
                  </button>
                </form>
              )}
            </span>
          </li>
        ))}
        {shift.assignments.length === 0 && (
          <li className="text-[12.5px] text-cream-dim">אף אחד עוד לא נרשם.</li>
        )}
      </ul>

      {!locked && available.length > 0 && (
        <form
          action={async (fd) => {
            await action(fd);
          }}
          className="mt-2.5 flex items-center gap-2"
        >
          <input type="hidden" name="shiftId" value={shift.id} />
          <ToolSelect name="userId" defaultValue="" className="max-w-[14rem]">
            <option value="" disabled>
              לשבץ מישהו…
            </option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </ToolSelect>
          <ToolButton type="submit" disabled={pending}>
            <Glyph name="plus" strokeWidth={2.5} />
            לשבץ
          </ToolButton>
          {state.error && (
            <span className="text-[12px] text-alarm">{state.error}</span>
          )}
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

export function AddShiftForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(createShift, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ToolButton type="button" accent="sun" onClick={() => setOpen(true)}>
        <Glyph name="plus" strokeWidth={2.6} />
        משמרת חדשה
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
      <div className="grid gap-2 sm:grid-cols-[auto_auto_auto_auto_auto_auto]">
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">תאריך</span>
          <ToolInput type="date" name="date" defaultValue={defaultDate} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">סוג</span>
          <ToolSelect name="mealType" defaultValue="dinner">
            {Object.entries(SHIFT_TYPES).map(([key, v]) => (
              <option key={key} value={key}>
                {v.he}
              </option>
            ))}
          </ToolSelect>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">התחלה</span>
          <ToolInput type="time" name="startTime" defaultValue="16:30" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">סיום</span>
          <ToolInput type="time" name="endTime" defaultValue="20:00" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">אנשים</span>
          <ToolInput
            type="number"
            name="requiredPeople"
            min={1}
            defaultValue={4}
            className="w-20"
          />
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

export function GenerateShiftsForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(generateShifts, EMPTY);

  return (
    <form
      action={async (fd) => {
        await action(fd);
      }}
      className="rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-4"
    >
      <p className="mb-1 font-display text-[15px] text-cream">
        לבנות לוח משמרות בסיסי
      </p>
      <p className="mb-3 max-w-xl text-[13px] leading-snug text-cream-2/75">
        בוקר, צהריים וערב לכל יום. אפשר לשנות שעות, כמויות ולמחוק אחר כך — זו
        רק נקודת התחלה כדי לא להקליד את אותו הדבר עשר פעמים.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">
            מתחילים ב־
          </span>
          <ToolInput type="date" name="start" defaultValue={defaultDate} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-cream-dim">
            כמה ימים
          </span>
          <ToolInput
            type="number"
            name="days"
            min={1}
            max={14}
            defaultValue={5}
            className="w-20"
          />
        </label>
        <ToolButton type="submit" accent="sun" active disabled={pending}>
          {pending ? "בונים…" : "לבנות לוח"}
        </ToolButton>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-[13px] text-alarm">
          {state.error}
        </p>
      )}
    </form>
  );
}
