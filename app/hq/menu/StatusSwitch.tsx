"use client";

import { useTransition } from "react";
import { setMealStatus } from "./actions";
import { cn } from "@/lib/utils";

/* Bible §38: menu items are proposed → being reviewed → final.
   Design Book §46: never colour alone — each state carries its own word. */

const STATES = [
  { key: "proposed", he: "טיוטה", cls: "bg-charcoal-5 text-cream" },
  { key: "review", he: "בבדיקה", cls: "bg-attention text-ink" },
  { key: "final", he: "סופית", cls: "bg-good text-ink" },
] as const;

export function StatusSwitch({
  mealId,
  status,
  disabled,
}: {
  mealId: string;
  status: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div
      role="group"
      aria-label="מצב הארוחה"
      className={cn(
        "inline-flex overflow-hidden rounded-[9px_11px_8px_10px] border-2 border-charcoal-5",
        pending && "opacity-60",
      )}
    >
      {STATES.map((state) => {
        const active = state.key === status;
        return (
          <button
            key={state.key}
            type="button"
            disabled={disabled || pending || active}
            aria-pressed={active}
            onClick={() =>
              start(async () => {
                const fd = new FormData();
                fd.set("id", mealId);
                fd.set("status", state.key);
                await setMealStatus(fd);
              })
            }
            className={cn(
              "px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
              active
                ? state.cls
                : "text-cream-dim hover:bg-charcoal-3 hover:text-cream",
              disabled && "cursor-not-allowed",
            )}
          >
            {state.he}
          </button>
        );
      })}
    </div>
  );
}
