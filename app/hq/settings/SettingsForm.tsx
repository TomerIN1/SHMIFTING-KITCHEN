"use client";

import { useActionState, useTransition } from "react";
import { updateCampSettings, setUserRole, type SettingsState } from "./actions";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { ToolInput } from "@/components/shmifting/Field";
import { Glyph } from "@/components/shmifting/Glyph";

const EMPTY: SettingsState = {};

export function CampSettingsForm({
  camp,
  locked,
}: {
  camp: {
    campName: string;
    inviteCode: string;
    departureDate: string;
    festivalStart: string;
    festivalEnd: string;
    shiftsPerPerson: number;
    shiftsOpenAt: string;
  };
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(updateCampSettings, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">שם הקמפ</span>
          <ToolInput
            name="campName"
            defaultValue={camp.campName}
            maxLength={40}
            disabled={locked}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            קוד הצטרפות לקמפ
          </span>
          <ToolInput
            name="inviteCode"
            defaultValue={camp.inviteCode}
            maxLength={20}
            className="uppercase tracking-[0.15em]"
            dir="ltr"
            disabled={locked}
          />
          <span className="mt-1 block text-[11.5px] text-cream-dim">
            מי שיודע את הקוד הזה יכול להצטרף. שווה להחליף אם דלף.
          </span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            יוצאים לאבק
          </span>
          <ToolInput
            type="date"
            name="departureDate"
            defaultValue={camp.departureDate}
            required
            disabled={locked}
          />
          <span className="mt-1 block text-[11.5px] text-cream-dim">
            זה הספירה לאחור שכולם רואים.
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            תחילת הפסטיבל
          </span>
          <ToolInput
            type="date"
            name="festivalStart"
            defaultValue={camp.festivalStart}
            required
            disabled={locked}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            סוף הפסטיבל
          </span>
          <ToolInput
            type="date"
            name="festivalEnd"
            defaultValue={camp.festivalEnd}
            required
            disabled={locked}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            כמה משמרות לכל אחד
          </span>
          <ToolInput
            type="number"
            name="shiftsPerPerson"
            min={0}
            max={10}
            defaultValue={camp.shiftsPerPerson}
            disabled={locked}
          />
          <span className="mt-1 block text-[11.5px] text-cream-dim">
            המכסה שלפיה נמדוד מי עוד לא לקח מספיק.
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-cream-dim">
            בחירת משמרות נפתחת ב־
          </span>
          <ToolInput
            type="date"
            name="shiftsOpenAt"
            defaultValue={camp.shiftsOpenAt}
            disabled={locked}
          />
          <span className="mt-1 block text-[11.5px] text-cream-dim">
            ריק = פתוח כבר עכשיו.
          </span>
        </label>
      </div>

      {!locked && (
        <div className="flex items-center gap-3">
          <ToolButton type="submit" accent="sun" active disabled={pending}>
            {pending ? "שומרים…" : "לשמור הגדרות"}
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
      )}
    </form>
  );
}

export function RoleToggle({
  userId,
  name,
  role,
  isSelf,
}: {
  userId: string;
  name: string;
  role: string;
  isSelf: boolean;
}) {
  const [, start] = useTransition();

  return (
    <form action={(fd) => start(() => setUserRole(fd).then(() => {}))}>
      <input type="hidden" name="userId" value={userId} />
      <input
        type="hidden"
        name="role"
        value={role === "admin" ? "shmifter" : "admin"}
      />
      <ToolButton
        type="submit"
        accent={role === "admin" ? "sun" : "cream"}
        active={role === "admin"}
        title={
          role === "admin"
            ? `להוריד את ${name} מניהול המטבח`
            : `לתת ל${name} גישה ל-Kitchen HQ`
        }
      >
        {role === "admin" ? "מנהל.ת מטבח" : "שמיפטר.ית"}
        {isSelf && role === "admin" && (
          <span className="text-[11px] opacity-70">(אתם)</span>
        )}
      </ToolButton>
    </form>
  );
}
