"use client";

import { useActionState, useTransition } from "react";
import { updateBudget, toggleBudgetReview, type BudgetState } from "./actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { money } from "@/lib/utils";

const EMPTY: BudgetState = {};

export function BudgetSettings({ perPerson, diners, dinersOverride, currency, locked }: {
  perPerson: number;
  diners: number;
  dinersOverride: number | null;
  currency: string;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(updateBudget, EMPTY);

  if (locked) {
    return (
      <p className="text-sm text-cream-2">
        {money(perPerson, currency)} לאדם × {diners} אנשים ={" "}
        <strong className="text-cream">
          {money(perPerson * diners, currency)}
        </strong>
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            תקציב לאדם
          </span>
          <ToolInput
            type="number"
            name="budgetPerPerson"
            min={0}
            step="1"
            defaultValue={perPerson}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            כמה אנשים אוכלים
          </span>
          {/* Empty means "count the roster". A number here is the Lead saying
              they know something the roster does not (Bible §23). */}
          <ToolInput
            type="number"
            name="expectedDiners"
            min={1}
            placeholder={String(diners)}
            defaultValue={dinersOverride ?? ""}
          />
          <span className="mt-1 block text-[11.5px] text-cream-dim">
            {dinersOverride === null
              ? `ריק = לפי הנרשמים. כרגע ${diners}.`
              : `ידני. לפי הנרשמים היו ${diners} — נקו את השדה כדי לחזור לזה.`}
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">מטבע</span>
          <ToolInput name="currency" defaultValue={currency} maxLength={3} />
        </label>
      </div>

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
  );
}

export function ReviewButton({ reviewed }: { reviewed: boolean }) {
  const [, start] = useTransition();

  return (
    <form
      action={(fd) => start(() => toggleBudgetReview(fd).then(() => {}))}
    >
      <input type="hidden" name="reviewed" value={reviewed ? "0" : "1"} />
      <button
        type="submit"
        className={
          reviewed
            ? "flex items-center gap-1.5 rounded-[10px_12px_9px_11px] border-2 border-good bg-good/15 px-3 py-2 text-sm font-medium text-good"
            : "flex items-center gap-1.5 rounded-[10px_12px_9px_11px] border-2 border-charcoal-5 px-3 py-2 text-sm font-medium text-cream-2 transition-colors hover:border-good hover:text-good"
        }
      >
        <Glyph name="check" strokeWidth={2.5} />
        {reviewed ? "התקציב נבדק" : "לסמן שהתקציב נבדק"}
      </button>
    </form>
  );
}
