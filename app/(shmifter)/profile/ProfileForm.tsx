"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { saveProfile, type ProfileState } from "./actions";
import {
  Field,
  TextInput,
  TextArea,
  Choice,
  ToolSelect,
  ToolInput,
  ToolTextArea,
} from "@/components/shmifting/Field";
import { StickerButton, ToolButton } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";
import { PaperCard } from "@/components/shmifting/surfaces";
import { ALLERGENS, RESTRICTIONS, SPICE_LEVELS, SEVERITY } from "@/lib/domain/allergens";
import { OBJECT } from "@/components/shmifting/assets";
import { cn } from "@/lib/utils";

/* ============================================================================
   THE FOOD PROFILE FORM — Bible §10, Design Book §37

   "Forms should feel warm rather than bureaucratic."

   Every question is asked the way a person would ask it out loud. But §37
   also draws a hard line — and §43 draws it harder — around allergies: that
   one section deliberately drops the warmth and becomes plain, serious and
   unmistakable. The tonal break IS the safety signal.
   ========================================================================= */

export interface ProfileFormValues {
  name: string;
  dietaryPattern: "omnivore" | "vegetarian" | "vegan";
  spiceLevel: number;
  restrictions: string[];
  dislikes: string[];
  wish: string;
  allergies: AllergyDraft[];
}

interface AllergyDraft {
  id?: string;
  key: string;
  allergen: string;
  label: string;
  details: string;
  severity: "avoid" | "severe" | "anaphylaxis";
  wasReviewed: boolean;
}

const EMPTY: ProfileState = {};

export function ProfileForm({
  initial,
  isFirstTime,
}: {
  initial: ProfileFormValues;
  isFirstTime: boolean;
}) {
  const [state, action, pending] = useActionState(saveProfile, EMPTY);

  /* "נשמר. תודה" is a moment, not a status. It used to sit in the save bar
     for the rest of the visit — and because that bar is sticky, it followed
     you down the page saying "saved" while you were busy changing things it
     had not saved yet. It now says its piece and steps back. */
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!state.ok) return;
    setJustSaved(true);
    const timer = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  const [name, setName] = useState(initial.name);
  const [pattern, setPattern] = useState(initial.dietaryPattern);
  const [spice, setSpice] = useState(initial.spiceLevel);
  const [restrictions, setRestrictions] = useState<string[]>(initial.restrictions);
  const [dislikes, setDislikes] = useState<string[]>(initial.dislikes);
  const [wish, setWish] = useState(initial.wish);
  const [allergyList, setAllergyList] = useState<AllergyDraft[]>(initial.allergies);

  const payload = JSON.stringify({
    name,
    dietaryPattern: pattern,
    spiceLevel: spice,
    restrictions,
    dislikes,
    wish,
    allergies: allergyList.map((a) => ({
      id: a.id,
      allergen: a.allergen,
      label: a.allergen === "other" ? a.label : null,
      details: a.details,
      severity: a.severity,
    })),
  });

  return (
    /* Constrained: Design Book §31 asks functional typography to stay
       readable, and a 1100px-wide text input is not. */
    <form action={action} className="max-w-3xl space-y-8">
      <input type="hidden" name="payload" value={payload} />

      {/* ---- WHO ---------------------------------------------------------- */}
      <Section
        title="איך קוראים לכם?"
        lead="ככה נדע על מי מדובר כשנתכנן את האוכל."
      >
        <Field label="שם" htmlFor="p-name">
          <TextInput
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
          />
        </Field>
      </Section>

      {/* ---- HOW DO YOU EAT ---------------------------------------------- */}
      <Section
        title="איך אתם אוכלים?"
        lead="זה קובע כמה מנות נכין מכל סוג."
      >
        <div className="grid gap-2.5 sm:grid-cols-3">
          {(
            [
              { key: "omnivore", he: "אוכל.ת הכל", detail: "בלי הגבלות" },
              { key: "vegetarian", he: "צמחוני.ת", detail: "בלי בשר ודגים" },
              { key: "vegan", he: "טבעוני.ת", detail: "בלי מוצרים מהחי בכלל" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPattern(option.key)}
              aria-pressed={pattern === option.key}
              className={cn(
                "rounded-[14px_17px_12px_16px] border-[2.5px] p-4 text-start transition-all",
                pattern === option.key
                  ? "border-ink bg-cream text-ink shadow-[4px_5px_0_0_var(--color-ink)]"
                  : "border-charcoal-5 bg-charcoal-2 text-cream hover:border-cream-dim",
              )}
            >
              <span className="block font-display text-[16px]">{option.he}</span>
              <span
                className={cn(
                  "mt-0.5 block text-[13px]",
                  pattern === option.key ? "text-ink/65" : "text-cream-2/70",
                )}
              >
                {option.detail}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ---- ALLERGIES — the serious section ------------------------------ */}
      <AllergySection list={allergyList} onChange={setAllergyList} />

      {/* ---- RESTRICTIONS -------------------------------------------------- */}
      <Section
        title="יש משהו שאתם לא אוכלים?"
        lead="לא אלרגיה — פשוט משהו שאתם נמנעים ממנו."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {RESTRICTIONS.map((r) => (
            <Choice
              key={r.key}
              type="checkbox"
              name="restriction"
              value={r.key}
              title={r.he}
              checked={restrictions.includes(r.key)}
              onChange={(next) =>
                setRestrictions((current) =>
                  next
                    ? [...current, r.key]
                    : current.filter((k) => k !== r.key),
                )
              }
              checkedBg="peer-checked:bg-dust-blue"
            />
          ))}
        </div>
      </Section>

      {/* ---- DISLIKES ------------------------------------------------------ */}
      <Section
        title="מה אתם פשוט לא אוהבים?"
        lead="לא נבנה את התפריט סביב זה, אבל ננסה לא לדחוף לכם את זה לצלחת."
      >
        <TagInput
          values={dislikes}
          onChange={setDislikes}
          placeholder="חציל, זיתים, כוסברה…"
        />
      </Section>

      {/* ---- SPICE --------------------------------------------------------- */}
      <Section title="כמה חריף?" lead="כדי שנדע כמה צ׳ילי להשאיר בצד.">
        <SpicePicker value={spice} onChange={setSpice} />
      </Section>

      {/* ---- THE HUMAN QUESTION -------------------------------------------- */}
      <Section
        title="מה היה עושה לכם טוב באמצע המדבר?"
        lead="אין תשובה נכונה. מנהל.ת המטבח באמת קורא.ת את זה."
      >
        <Field label="המשאלה שלכם" htmlFor="p-wish" optional>
          <TextArea
            id="p-wish"
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            maxLength={500}
            placeholder="משהו שמתבשל שעות ומריח על כל הקמפ…"
          />
        </Field>
      </Section>

      {/* ---- SAVE ---------------------------------------------------------- */}
      <div className="sticky bottom-24 z-30 lg:bottom-6">
        <PaperCard
          accent="sun"
          className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-ink/70">
            {justSaved
              ? "נשמר. תודה — זה באמת עוזר."
              : isFirstTime
                ? "אפשר לחזור ולערוך את זה מתי שרוצים."
                : "שינויים נשמרים רק כשלוחצים כאן."}
          </p>
          <div className="flex items-center gap-3">
            {state.error && (
              <span
                role="alert"
                className="flex items-center gap-1.5 text-sm font-medium text-alarm-deep"
              >
                <Glyph name="alert" strokeWidth={2.4} />
                {state.error}
              </span>
            )}
            <StickerButton
              type="submit"
              accent={justSaved ? "good" : "sun"}
              size="md"
              tilt
              disabled={pending}
            >
              {pending ? "שומרים…" : justSaved ? "נשמר" : "לשמור את הפרופיל"}
              {justSaved && !pending && <Glyph name="check" strokeWidth={3} />}
            </StickerButton>
          </div>
        </PaperCard>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------------- */

function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3.5">
      <div>
        <h2 className="font-display text-xl text-cream sm:text-2xl">{title}</h2>
        {lead && (
          <p className="mt-1 text-sm leading-relaxed text-cream-2/75">{lead}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/* ---- ALLERGIES ---------------------------------------------------------- */

function AllergySection({
  list,
  onChange,
}: {
  list: AllergyDraft[];
  onChange: (next: AllergyDraft[]) => void;
}) {
  const add = () =>
    onChange([
      ...list,
      {
        key: crypto.randomUUID(),
        allergen: "gluten",
        label: "",
        details: "",
        severity: "avoid",
        wasReviewed: false,
      },
    ]);

  const update = (key: string, patch: Partial<AllergyDraft>) =>
    onChange(list.map((a) => (a.key === key ? { ...a, ...patch } : a)));

  const remove = (key: string) => onChange(list.filter((a) => a.key !== key));

  return (
    /* Deliberately NOT a PaperCard, NOT tilted, NOT playful.
       Design Book §43: this must communicate ATTENTION, not FUN. */
    <section className="rounded-md border-2 border-alarm/55 bg-alarm/[0.07] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-alarm text-alarm">
          <Glyph name="alert" strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-xl text-cream sm:text-2xl">
            ממה צריך להיזהר?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-cream-2/85">
            אלרגיות זה לא העדפה. מה שתכתבו כאן מגיע ישירות למי שמבשל, ומסומן
            בכל מנה שיכולה להיות בעייתית. אם אתם לא בטוחים — עדיף לכתוב.
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-4 rounded-md border-2 border-dashed border-charcoal-5 p-4 text-center text-sm text-cream-dim">
          לא דיווחתם על אלרגיות. אם אין — מצוין, אפשר להמשיך.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((entry) => (
            <li
              key={entry.key}
              className="rounded-md border-2 border-charcoal-5 bg-charcoal-2 p-3.5"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-cream-2">
                    האלרגן
                  </span>
                  <ToolSelect
                    value={entry.allergen}
                    onChange={(e) =>
                      update(entry.key, { allergen: e.target.value })
                    }
                  >
                    {ALLERGENS.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.he}
                      </option>
                    ))}
                  </ToolSelect>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-cream-2">
                    כמה זה רציני
                  </span>
                  <ToolSelect
                    value={entry.severity}
                    onChange={(e) =>
                      update(entry.key, {
                        severity: e.target.value as AllergyDraft["severity"],
                      })
                    }
                  >
                    {(
                      Object.keys(SEVERITY) as (keyof typeof SEVERITY)[]
                    ).map((key) => (
                      <option key={key} value={key}>
                        {SEVERITY[key].he}
                      </option>
                    ))}
                  </ToolSelect>
                </label>

                <button
                  type="button"
                  onClick={() => remove(entry.key)}
                  aria-label="להסיר את האלרגיה הזו"
                  className="mt-auto flex h-[38px] w-10 items-center justify-center rounded-[7px_9px_6px_8px] border-2 border-charcoal-5 text-cream-dim transition-colors hover:border-alarm hover:text-alarm"
                >
                  <Glyph name="cross" strokeWidth={2.4} />
                </button>
              </div>

              {entry.allergen === "other" && (
                <label className="mt-3 block">
                  <span className="mb-1 block text-[13px] font-medium text-cream-2">
                    מה בדיוק?
                  </span>
                  <ToolInput
                    value={entry.label}
                    onChange={(e) => update(entry.key, { label: e.target.value })}
                    placeholder="שם האלרגן"
                    maxLength={80}
                  />
                </label>
              )}

              <label className="mt-3 block">
                <span className="mb-1 block text-[13px] font-medium text-cream-2">
                  מה שחשוב שנדע
                </span>
                <ToolTextArea
                  value={entry.details}
                  onChange={(e) => update(entry.key, { details: e.target.value })}
                  maxLength={600}
                  placeholder="גם עקבות? יש לכם אפיפן? צריך כלים נפרדים?"
                />
              </label>

              <p className="mt-2 text-[12.5px] text-cream-dim">
                {SEVERITY[entry.severity].handling}
              </p>
            </li>
          ))}
        </ul>
      )}

      <ToolButton type="button" onClick={add} className="mt-3.5">
        <Glyph name="plus" strokeWidth={2.4} />
        להוסיף אלרגיה
      </ToolButton>
    </section>
  );
}

/* ---- DISLIKES ----------------------------------------------------------- */

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim();
    if (!value || values.includes(value) || values.length >= 20) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex gap-2">
        <TextInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          maxLength={40}
          aria-label="להוסיף משהו שאתם לא אוהבים"
        />
        <StickerButton
          type="button"
          onClick={commit}
          accent="dust-blue"
          size="md"
          className="shrink-0"
        >
          <Glyph name="plus" strokeWidth={2.6} />
        </StickerButton>
      </div>

      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="group flex items-center gap-1.5 rounded-[9px_11px_8px_10px] border-2 border-ink bg-cream-3 px-2.5 py-1 text-sm text-ink transition-colors hover:bg-alarm hover:text-cream"
              >
                {value}
                <Glyph
                  name="cross"
                  strokeWidth={2.6}
                  className="text-[11px] opacity-50 group-hover:opacity-100"
                  label={`להסיר ${value}`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- SPICE -------------------------------------------------------------- */

function SpicePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label="רמת חריפות" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SPICE_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            role="radio"
            aria-checked={value === level.value}
            onClick={() => onChange(level.value)}
            className={cn(
              "flex items-center gap-2 rounded-[12px_15px_11px_14px] border-[2.5px] px-3 py-2 transition-all",
              value === level.value
                ? "border-ink bg-cream text-ink shadow-[4px_5px_0_0_var(--color-ink)]"
                : "border-charcoal-5 bg-charcoal-2 text-cream-2 hover:border-cream-dim",
            )}
          >
            <span className="flex items-center gap-0.5" aria-hidden>
              {level.flames === 0 ? (
                <Glyph name="minus" strokeWidth={2.6} className="text-base opacity-60" />
              ) : (
                Array.from({ length: level.flames }).map((_, i) => (
                  <Image
                    key={i}
                    src={OBJECT.vegChili}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                ))
              )}
            </span>
            <span className="text-sm font-medium">{level.he}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
