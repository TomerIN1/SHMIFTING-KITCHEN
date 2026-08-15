"use client";

import Link from "next/link";

import { useActionState, useState, useTransition } from "react";
import {
  createRound,
  setRoundStatus,
  addOption,
  updateOption,
  deleteOption,
  deleteRound,
  updateRound,
  promoteToMeal,
  type VoteAdminState,
} from "./actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import {
  ToolInput,
  ToolSelect,
  ToolTextArea,
} from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";
import { OptionTags } from "@/components/shmifting/OptionTags";
import { OPTION_TAG_KEYS, optionTagLabel } from "@/lib/domain/categories";
import { MEAL_TYPES } from "@/lib/domain/categories";
import { cn } from "@/lib/utils";

const EMPTY: VoteAdminState = {};

/* ============================================================================
   VOTING ADMINISTRATION — Bible §14, §40

   Closing a round while people have not voted triggers a warning that names
   the number, then lets the Kitchen Lead proceed. Bible §40 asks for
   prevention over recovery — but also warns against warning fatigue, so the
   warning appears once, at the moment it matters, and is dismissible by
   simply confirming.
   ========================================================================= */

/* <input type="date"> wants YYYY-MM-DD in local time. toISOString() would hand
   it UTC and shift the evening by a day for anyone east of Greenwich, which is
   everybody here. */
function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function RoundStatusControls({
  roundId,
  status,
  optionCount,
}: {
  roundId: string;
  status: string;
  optionCount: number;
}) {
  const [state, action, pending] = useActionState(setRoundStatus, EMPTY);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status !== "open" && (
          <form action={action}>
            <input type="hidden" name="id" value={roundId} />
            <input type="hidden" name="status" value="open" />
            <ToolButton
              type="submit"
              accent="sun"
              active={false}
              disabled={pending || optionCount < 2}
              title={
                optionCount < 2 ? "צריך לפחות שתי אפשרויות" : undefined
              }
              className="border-sun/60 text-sun hover:border-sun"
            >
              <Glyph name="flame" strokeWidth={2.3} />
              לפתוח הצבעה
            </ToolButton>
          </form>
        )}

        {status === "open" && (
          <form action={action}>
            <input type="hidden" name="id" value={roundId} />
            <input type="hidden" name="status" value="closed" />
            <ToolButton type="submit" disabled={pending}>
              <Glyph name="lock" strokeWidth={2.3} />
              לסגור הצבעה
            </ToolButton>
          </form>
        )}

        {status === "closed" && (
          <form action={action}>
            <input type="hidden" name="id" value={roundId} />
            <input type="hidden" name="status" value="open" />
            <ToolButton type="submit" disabled={pending}>
              <Glyph name="unlock" strokeWidth={2.3} />
              לפתוח מחדש
            </ToolButton>
          </form>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-[13px] text-alarm">
          {state.error}
        </p>
      )}

      {state.confirmClose && (
        <form
          action={action}
          className="rounded-md border-2 border-attention/60 border-s-[6px] border-s-attention bg-attention/[0.08] p-3"
        >
          <input type="hidden" name="id" value={roundId} />
          <input type="hidden" name="status" value="closed" />
          <input type="hidden" name="confirmed" value="1" />
          <p className="flex items-center gap-2 text-[13.5px] text-cream">
            <Glyph name="alert" className="text-attention" strokeWidth={2.4} />
            {state.confirmClose.missing} אנשים עוד לא הצביעו.
          </p>
          <p className="mt-1 text-[12.5px] text-cream-2/80">
            אחרי הסגירה הם לא יוכלו להצביע יותר. שווה לשלוח תזכורת קודם.
          </p>
          <div className="mt-2 flex gap-2">
            <ToolButton type="submit" disabled={pending}>
              בכל זאת לסגור
            </ToolButton>
          </div>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

export function CreateRoundForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(createRound, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ToolButton type="button" accent="sun" onClick={() => setOpen(true)}>
        <Glyph name="plus" strokeWidth={2.6} />
        הצבעה חדשה
      </ToolButton>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
      }}
      className="w-full space-y-2.5 rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-4"
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">כותרת</span>
          <ToolInput
            name="title"
            placeholder="THE GREAT MENU VOTE"
            required
            maxLength={80}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            שורה מסבירה
          </span>
          <ToolInput
            name="subtitle"
            placeholder="ארוחת הערב של ליל שישי. אחת. תבחרו טוב."
            maxLength={140}
          />
        </label>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            לאיזו ארוחה
          </span>
          <ToolSelect name="mealType" defaultValue="dinner">
            {Object.entries(MEAL_TYPES).map(([key, v]) => (
              <option key={key} value={key}>
                {v.he}
              </option>
            ))}
          </ToolSelect>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            תאריך הארוחה
          </span>
          <ToolInput type="date" name="mealDate" defaultValue={defaultDate} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            ההצבעה נסגרת
          </span>
          <ToolInput type="date" name="closesAt" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            כמה להבות לכל אחד
          </span>
          <ToolInput
            type="number"
            name="tokensPerVoter"
            min={1}
            max={10}
            defaultValue={3}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <ToolButton type="submit" accent="sun" active disabled={pending}>
          {pending ? "יוצרים…" : "ליצור הצבעה"}
        </ToolButton>
        <ToolButton type="button" onClick={() => setOpen(false)}>
          ביטול
        </ToolButton>
        {state.error && (
          <span role="alert" className="text-[13px] text-alarm">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------------- */

export function OptionEditor({
  roundId,
  options,
  editable,
  showPromote,
}: {
  roundId: string;
  options: {
    id: string;
    title: string;
    description: string | null;
    dishes: string | null;
    dietaryNote: string | null;
    dietary: string;
    tags: string[];
    mealDate: Date | null;
    costedDishes: number;
    flames: number;
    share: number;
    voters: number;
  }[];
  editable: boolean;
  showPromote: boolean;
}) {
  const [state, action, pending] = useActionState(addOption, EMPTY);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-2.5">
      {options.map((option) => (
        <OptionRow
          key={option.id}
          option={option}
          roundId={roundId}
          editable={editable}
          showPromote={showPromote}
        />
      ))}

      {editable &&
        (adding ? (
          <form
            action={async (fd) => {
              await action(fd);
              setAdding(false);
            }}
            className="space-y-2.5 rounded-[13px_16px_12px_15px] border-2 border-sun/50 bg-charcoal-2 p-3.5"
          >
            <input type="hidden" name="roundId" value={roundId} />
            <label className="block">
              <span className="mb-1 block text-[12px] text-cream-dim">
                שם הרעיון
              </span>
              <ToolInput name="title" placeholder="ליל הודו" required maxLength={80} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-cream-dim">תיאור</span>
              <ToolTextArea
                name="description"
                placeholder="קארי עדשים שמתבשל מהצהריים, אורז בסמטי, ולחם שנאפה על האש."
                maxLength={300}
              />
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[12px] text-cream-dim">
                  מנות — שורה לכל אחת
                </span>
                <ToolTextArea
                  name="dishes"
                  placeholder={"קארי עדשים ובטטה\nאורז בסמטי\nסלט קצוץ"}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-cream-dim">
                  הערה תזונתית
                </span>
                <ToolInput
                  name="dietaryNote"
                  placeholder="טבעוני במקור"
                  maxLength={120}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-cream-dim">
                  תזונה
                </span>
                <ToolSelect name="dietary" defaultValue="omnivore">
                  <option value="omnivore">רגיל</option>
                  <option value="vegetarian">צמחוני</option>
                  <option value="vegan">טבעוני</option>
                </ToolSelect>
              </label>
              <fieldset className="block sm:col-span-2">
                <legend className="mb-1.5 text-[12px] text-cream-dim">
                  תגיות
                </legend>
                <div className="flex flex-wrap gap-3">
                  {OPTION_TAG_KEYS.map((tag) => (
                    <label
                      key={tag}
                      className="flex items-center gap-1.5 text-[13px] text-cream-2"
                    >
                      <input
                        type="checkbox"
                        name="tags"
                        value={tag}
                        className="h-4 w-4 accent-sun"
                      />
                      {optionTagLabel(tag)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="mb-1 block text-[12px] text-cream-dim">
                  באיזה ערב
                </span>
                <ToolInput type="date" name="mealDate" />
                <span className="mt-1 block text-[11.5px] text-cream-dim">
                  אפשר להשאיר ריק ולהחליט אחרי ההצבעה.
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <ToolButton type="submit" accent="sun" active disabled={pending}>
                {pending ? "מוסיפים…" : "להוסיף רעיון"}
              </ToolButton>
              <ToolButton type="button" onClick={() => setAdding(false)}>
                ביטול
              </ToolButton>
              {state.error && (
                <span className="text-[13px] text-alarm">{state.error}</span>
              )}
            </div>
          </form>
        ) : (
          <ToolButton type="button" accent="sun" onClick={() => setAdding(true)}>
            <Glyph name="plus" strokeWidth={2.6} />
            להוסיף רעיון
          </ToolButton>
        ))}
    </div>
  );
}

function OptionRow({
  option,
  roundId,
  editable,
  showPromote,
}: {
  roundId: string;
  option: {
    id: string;
    title: string;
    description: string | null;
    dishes: string | null;
    dietaryNote: string | null;
    dietary: string;
    tags: string[];
    mealDate: Date | null;
    costedDishes: number;
    flames: number;
    share: number;
    voters: number;
  };
  editable: boolean;
  showPromote: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [, start] = useTransition();

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateOption(fd);
          setEditing(false);
        }}
        className="space-y-2.5 rounded-[13px_16px_12px_15px] border-2 border-sun/50 bg-charcoal-2 p-3.5"
      >
        <input type="hidden" name="id" value={option.id} />
        <ToolInput name="title" defaultValue={option.title} required maxLength={80} />
        <ToolTextArea
          name="description"
          defaultValue={option.description ?? ""}
          maxLength={300}
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <ToolTextArea name="dishes" defaultValue={option.dishes ?? ""} />
          <ToolInput
            name="dietaryNote"
            defaultValue={option.dietaryNote ?? ""}
            maxLength={120}
          />
          <fieldset className="block sm:col-span-2">
            <legend className="mb-1.5 text-[12px] text-cream-dim">תגיות</legend>
            <div className="flex flex-wrap gap-3">
              {OPTION_TAG_KEYS.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-1.5 text-[13px] text-cream-2"
                >
                  <input
                    type="checkbox"
                    name="tags"
                    value={tag}
                    defaultChecked={(option.tags ?? []).includes(tag)}
                    className="h-4 w-4 accent-sun"
                  />
                  {optionTagLabel(tag)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">תזונה</span>
            <ToolSelect name="dietary" defaultValue={option.dietary ?? "omnivore"}>
              <option value="omnivore">רגיל</option>
              <option value="vegetarian">צמחוני</option>
              <option value="vegan">טבעוני</option>
            </ToolSelect>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              באיזה ערב מבשלים את זה
            </span>
            <ToolInput
              type="date"
              name="mealDate"
              defaultValue={option.mealDate ? toDateInput(option.mealDate) : ""}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <ToolButton type="submit" accent="sun" active>
            לשמור
          </ToolButton>
          <ToolButton type="button" onClick={() => setEditing(false)}>
            ביטול
          </ToolButton>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-display text-[16px] text-cream">{option.title}</h4>
          {option.description && (
            <p className="mt-0.5 max-w-2xl text-[13px] leading-snug text-cream-2/80">
              {option.description}
            </p>
          )}
          {option.dietaryNote && (
            <p className="mt-1 text-[12.5px] text-good">{option.dietaryNote}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-end">
            <p className="text-xl font-black tabular-nums text-sun" dir="ltr">
              {option.flames}
            </p>
            <p className="text-[11.5px] text-cream-dim">
              {option.share}% · {option.voters} אנשים
            </p>
          </div>

          {showPromote && (
            <form action={(fd) => start(() => promoteToMeal(fd).then(() => {}))}>
              <input type="hidden" name="optionId" value={option.id} />
              <ToolButton
                type="submit"
                className="border-good/60 text-good hover:border-good"
                title="ליצור ארוחה בתפריט מהרעיון הזה"
              >
                <Glyph name="arrow" strokeWidth={2.3} />
                לתפריט
              </ToolButton>
            </form>
          )}

          {/* Cost the evening before the camp decides. Always available, even
              on a closed round — knowing what the loser would have cost is
              how you argue for it next year. */}
          <Link
            href={`/hq/votes/${roundId}/${option.id}`}
            title="לתמחר את הערב הזה"
            className="inline-flex items-center gap-1.5 rounded-[9px_11px_8px_10px] border-2 border-charcoal-5 px-2.5 py-1.5 text-[12.5px] text-cream-2 transition-colors hover:border-sun hover:text-sun"
          >
            <Glyph name="coin" strokeWidth={2.2} />
            {option.costedDishes > 0 ? `${option.costedDishes} מנות` : "לתמחר"}
          </Link>

          {editable && (
            <>
              <ToolButton type="button" onClick={() => setEditing(true)}>
                <Glyph name="pencil" strokeWidth={2.2} />
              </ToolButton>
              <form action={(fd) => start(() => deleteOption(fd).then(() => {}))}>
                <input type="hidden" name="id" value={option.id} />
                <ToolButton
                  type="submit"
                  className="hover:border-alarm hover:text-alarm"
                >
                  <Glyph name="cross" strokeWidth={2.4} />
                </ToolButton>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Diet and tags, so the Lead can see at a glance that every night has
          a vegan main without opening each idea. */}
      <OptionTags
        dietary={option.dietary}
        tags={option.tags}
        className="mt-2"
      />

      {option.dishes && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {option.dishes
            .split("\n")
            .filter(Boolean)
            .map((dish) => (
              <li
                key={dish}
                className="rounded border border-charcoal-5 px-1.5 py-0.5 text-[12px] text-cream-dim"
              >
                {dish}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

export function RoundSettings({
  round,
}: {
  round: {
    id: string;
    title: string;
    subtitle: string | null;
    tokensPerVoter: number;
    closesAt: string;
  };
}) {
  const [state, action, pending] = useActionState(updateRound, EMPTY);
  const [deleting, setDeleting] = useState(false);
  const [, start] = useTransition();

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-2.5">
        <input type="hidden" name="id" value={round.id} />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">כותרת</span>
            <ToolInput name="title" defaultValue={round.title} maxLength={80} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              שורה מסבירה
            </span>
            <ToolInput
              name="subtitle"
              defaultValue={round.subtitle ?? ""}
              maxLength={140}
            />
          </label>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              כמה להבות לכל אחד
            </span>
            <ToolInput
              type="number"
              name="tokensPerVoter"
              min={1}
              max={10}
              defaultValue={round.tokensPerVoter}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-cream-dim">
              נסגרת בתאריך
            </span>
            <ToolInput type="date" name="closesAt" defaultValue={round.closesAt} />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <ToolButton type="submit" accent="sun" active disabled={pending}>
            {pending ? "שומרים…" : "לשמור"}
          </ToolButton>
          {state.ok && <span className="text-[13px] text-good">נשמר</span>}
          {state.error && (
            <span className="text-[13px] text-alarm">{state.error}</span>
          )}
        </div>
      </form>

      <div className="border-t-2 border-charcoal-4 pt-3">
        {deleting ? (
          <form
            action={(fd) => start(() => deleteRound(fd).then(() => {}))}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="id" value={round.id} />
            <span className="text-[13px] text-alarm">
              למחוק את ההצבעה ואת כל הקולות שכבר ניתנו?
            </span>
            <ToolButton
              type="submit"
              className="border-alarm text-alarm hover:bg-alarm/15"
            >
              כן, למחוק
            </ToolButton>
            <ToolButton type="button" onClick={() => setDeleting(false)}>
              ביטול
            </ToolButton>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className={cn(
              "text-[12.5px] text-cream-dim underline transition-colors hover:text-alarm",
            )}
          >
            למחוק את ההצבעה
          </button>
        )}
      </div>
    </div>
  );
}
