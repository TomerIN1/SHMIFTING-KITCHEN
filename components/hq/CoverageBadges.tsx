import Link from "next/link";
import { StatusChip } from "@/components/shmifting/Status";
import type { MealCoverage } from "@/lib/domain/coverage";
import { allergenLabel, dietaryLabel } from "@/lib/domain/allergens";

/* ============================================================================
   DIETARY COVERAGE READOUT — Bible §17

   The Bible spells out the exact shape it wants:

     46 diners
     Vegan coverage: ✓
     Vegetarian coverage: ✓
     Allergy conflict: ⚠️ 1

   Rendered with a word beside every mark, because Design Book §46 forbids
   leaning on colour or a glyph alone.
   ========================================================================= */

export function CoverageBadges({
  coverage,
  servings,
  compact = false,
}: {
  coverage: MealCoverage;
  servings: number;
  compact?: boolean;
}) {
  const patterns = ["vegan", "vegetarian", "omnivore"] as const;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusChip tone="idle" glyph="people" size={compact ? "sm" : "md"}>
        {servings} סועדים
      </StatusChip>

      {patterns.map((pattern) => {
        const entry = coverage.byPattern[pattern];
        if (!entry || entry.people === 0) return null;
        return (
          <StatusChip
            key={pattern}
            tone={entry.ok ? "done" : "alarm"}
            size={compact ? "sm" : "md"}
          >
            {dietaryLabel(pattern)} {entry.ok ? "מכוסה" : "לא מכוסה"}
          </StatusChip>
        );
      })}

      {coverage.blockedCount > 0 && (
        <StatusChip tone="alarm" size={compact ? "sm" : "md"}>
          {coverage.blockedCount} בלי מה לאכול
        </StatusChip>
      )}

      {coverage.noMainCount > 0 && (
        <StatusChip tone="attention" size={compact ? "sm" : "md"}>
          {coverage.noMainCount} בלי מנה עיקרית
        </StatusChip>
      )}

      {coverage.dishesWithoutRecipe > 0 && (
        <StatusChip tone="attention" size={compact ? "sm" : "md"} glyph="pot">
          {coverage.dishesWithoutRecipe} בלי מתכון
        </StatusChip>
      )}
    </div>
  );
}

/* The named list behind those numbers. A count tells the Kitchen Lead there is
   a problem; only a name tells them who to go and talk to. */
export function ConflictList({ coverage }: { coverage: MealCoverage }) {
  if (coverage.conflicts.length === 0) return null;

  const blocked = coverage.conflicts.filter((c) => c.kind === "blocked");
  const thin = coverage.conflicts.filter((c) => c.kind === "no_main");

  return (
    <div className="space-y-2">
      {blocked.length > 0 && (
        <div className="rounded-md border-2 border-alarm border-s-[6px] border-s-alarm bg-alarm/[0.08] p-3">
          <p className="font-display text-[14px] text-alarm">
            אין להם מה לאכול בארוחה הזו
          </p>
          <ul className="mt-1.5 space-y-1">
            {blocked.map((c) => (
              <li key={c.userId} className="text-[13px] text-cream-2">
                <strong className="font-semibold text-cream">
                  {c.userName}
                </strong>
                {c.allergens.length > 0 && (
                  <>
                    {" — "}
                    {c.allergens.map((a) => allergenLabel(a)).join(", ")}
                  </>
                )}
                {c.offendingDishes.length > 0 && (
                  <span className="text-cream-dim">
                    {" "}
                    (
                    {c.offendingDishes.map((d) => d.name).join(", ")})
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] text-cream-2/75">
            הוסיפו מנה שמתאימה להם, או שנו את הרכב המנות הקיימות.
          </p>
        </div>
      )}

      {thin.length > 0 && (
        <div className="rounded-md border-2 border-attention/60 border-s-[6px] border-s-attention bg-attention/[0.07] p-3">
          <p className="font-display text-[14px] text-attention">
            יש להם רק תוספות — בלי מנה עיקרית
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {thin.map((c) => (
              <li
                key={c.userId}
                className="rounded border border-attention/40 px-1.5 py-0.5 text-[12.5px] text-cream-2"
              >
                {c.userName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AllergensPresent({
  allergens,
  href,
}: {
  allergens: string[];
  href?: string;
}) {
  if (allergens.length === 0) return null;
  const body = (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-[12.5px] font-medium text-cream-dim">
        אלרגנים בארוחה:
      </span>
      {allergens.map((a) => (
        <span
          key={a}
          className="rounded border border-attention/50 bg-attention/10 px-1.5 py-0.5 text-[12px] text-attention"
        >
          {allergenLabel(a)}
        </span>
      ))}
    </span>
  );

  return href ? (
    <Link href={href} className="inline-block hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}
