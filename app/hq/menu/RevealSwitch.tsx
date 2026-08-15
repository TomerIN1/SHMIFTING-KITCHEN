"use client";

import { useTransition, useState } from "react";
import { revealMenu, hideMenu } from "./reveal-actions";
import { StickerButton, ToolButton } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";
import { mealCount } from "@/lib/utils";

/* ============================================================================
   THE REVEAL — Bible §16
   "Once enough menu decisions are final, camp members should receive a
    dedicated reveal experience. The goal is anticipation."

   Deliberately a decision the Kitchen Lead makes, not a threshold the system
   crosses on its own. Revealing half a menu spends the moment for nothing.
   ========================================================================= */

export function RevealSwitch({
  revealed,
  finalMeals,
  locked,
}: {
  revealed: boolean;
  finalMeals: number;
  locked: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (revealed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-good/50 border-s-[6px] border-s-good bg-good/[0.07] p-3.5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-[15px] text-good">
            <Glyph name="check" strokeWidth={2.4} />
            התפריט חשוף לקמפ
          </p>
          <p className="mt-0.5 text-[13px] text-cream-2/80">
            כל אחד רואה עכשיו את {mealCount(finalMeals)} הסופיות, עם סימון אישי
            למי שיש אלרגיה.
          </p>
        </div>
        {!locked && (
          <ToolButton
            type="button"
            disabled={pending}
            onClick={() => start(() => hideMenu())}
          >
            להסתיר שוב
          </ToolButton>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-charcoal-4 border-s-[6px] border-s-lavender bg-charcoal-2 p-3.5">
      <div className="min-w-0">
        <p className="font-display text-[15px] text-cream">
          התפריט עוד לא נחשף
        </p>
        <p className="mt-0.5 max-w-xl text-[13px] leading-snug text-cream-2/80">
          {finalMeals === 0
            ? "אין עדיין אף ארוחה סופית לחשוף."
            : `${mealCount(finalMeals)} סופיות. חשיפה היא רגע — עדיף לחכות עד שיש מספיק תפריט להתלהב ממנו.`}
        </p>
      </div>

      {finalMeals > 0 &&
        !locked &&
        (confirming ? (
          <div className="flex items-center gap-2">
            <StickerButton
              type="button"
              accent="terracotta"
              size="sm"
              disabled={pending}
              onClick={() => start(() => revealMenu())}
            >
              {pending ? "חושפים…" : "כן, לחשוף עכשיו"}
            </StickerButton>
            <ToolButton type="button" onClick={() => setConfirming(false)}>
              ביטול
            </ToolButton>
          </div>
        ) : (
          <StickerButton
            type="button"
            accent="terracotta"
            size="sm"
            tilt
            onClick={() => setConfirming(true)}
          >
            THE MENU HAS SPOKEN
            <Glyph name="star" strokeWidth={2.2} />
          </StickerButton>
        ))}
    </div>
  );
}
