import { optionTagLabel } from "@/lib/domain/categories";
import { cn } from "@/lib/utils";

/* ============================================================================
   WHAT YOU SHOULD KNOW BEFORE YOU VOTE

   Diet and tags rendered as one row, because from a member's side there is no
   difference: "טבעוני" and "חריף" and "ללא גלוטן" are all just things worth
   knowing about the plate. They are two columns underneath only so that the
   coverage engine has one authoritative diet to read.

   Colour follows Design Book §9: the reserved state colours mean something.
   Green is the reassurance (safe to eat), amber is the caution (contains
   something), red is the warning (this will bite). Diet is not a warning, so
   it wears cream and stays quiet.
   ========================================================================= */

const TONE: Record<string, string> = {
  good: "border-good bg-good/20 text-good",
  attention: "border-attention bg-attention/15 text-attention",
  alarm: "border-alarm bg-alarm/15 text-alarm",
  neutral: "border-ink/30 bg-ink/[0.07] text-ink/75",
};

const TAG_TONE: Record<string, string> = {
  spicy: "alarm",
  gluten: "attention",
  "gluten-free": "good",
};

export function OptionTags({
  dietary,
  tags,
  className,
  onInk = false,
}: {
  dietary?: string | null;
  tags?: string[] | null;
  className?: string;
  /* True when the chips sit on cream paper rather than a charcoal panel. */
  onInk?: boolean;
}) {
  const chips: { key: string; label: string; tone: string }[] = [];

  if (dietary === "vegan") chips.push({ key: "vegan", label: "טבעוני", tone: "neutral" });
  if (dietary === "vegetarian") chips.push({ key: "veg", label: "צמחוני", tone: "neutral" });

  for (const tag of tags ?? []) {
    chips.push({ key: tag, label: optionTagLabel(tag), tone: TAG_TONE[tag] ?? "neutral" });
  }

  if (chips.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((chip) => (
        <li
          key={chip.key}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-tight",
            chip.tone === "neutral" && !onInk
              ? "border-cream-dim/40 bg-cream/10 text-cream-2"
              : TONE[chip.tone],
          )}
        >
          {chip.label}
        </li>
      ))}
    </ul>
  );
}
