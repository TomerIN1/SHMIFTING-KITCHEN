"use client";

import { useActionState, useState } from "react";
import { joinCamp, signIn, type AuthState } from "@/lib/auth/actions";
import { Field, TextInput } from "@/components/shmifting/Field";
import { StickerButton } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";
import { cn } from "@/lib/utils";

const EMPTY: AuthState = {};

export function AuthForms({ firstEver }: { firstEver: boolean }) {
  const [mode, setMode] = useState<"join" | "signin">(
    firstEver ? "join" : "signin",
  );

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="כניסה לקמפ"
        className="mb-5 flex gap-2"
      >
        <Tab
          active={mode === "join"}
          onClick={() => setMode("join")}
          controls="panel-join"
        >
          אני חדש.ה כאן
        </Tab>
        <Tab
          active={mode === "signin"}
          onClick={() => setMode("signin")}
          controls="panel-signin"
        >
          כבר יש לי חשבון
        </Tab>
      </div>

      {mode === "join" ? (
        <JoinForm firstEver={firstEver} />
      ) : (
        <SignInForm />
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  controls,
  children,
}: {
  active: boolean;
  onClick: () => void;
  controls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[11px_13px_10px_12px] border-[2.5px] px-3 py-2 font-display text-sm transition-all",
        active
          ? "border-ink bg-sun text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
          : "border-charcoal-5 text-cream-2 hover:border-cream-dim",
      )}
    >
      {children}
    </button>
  );
}

function JoinForm({ firstEver }: { firstEver: boolean }) {
  const [state, action, pending] = useActionState(joinCamp, EMPTY);

  return (
    <form
      action={action}
      id="panel-join"
      role="tabpanel"
      className="space-y-4"
      noValidate
    >
      {firstEver && (
        <p className="rounded-[11px_13px_10px_12px] border-2 border-sun/50 bg-sun/10 p-3 text-[13px] leading-relaxed text-cream-2">
          אף אחד עוד לא נרשם למטבח הזה. מי שנרשם.ת ראשון.ה הופך.ת למנהל.ת
          המטבח, ומקבל.ת גישה ל־Kitchen HQ.
        </p>
      )}

      <Field label="איך קוראים לכם?" htmlFor="join-name" error={state.field === "name" ? state.error : undefined}>
        <TextInput
          id="join-name"
          name="name"
          defaultValue={state.values?.name}
          autoComplete="name"
          required
          placeholder="השם שאנשים בקמפ מכירים"
        />
      </Field>

      <Field label="מייל" htmlFor="join-email" error={state.field === "email" ? state.error : undefined}>
        <TextInput
          id="join-email"
          name="email"
          defaultValue={state.values?.email}
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          className="text-start"
        />
      </Field>

      <Field
        label="סיסמה"
        htmlFor="join-password"
        hint="לפחות 8 תווים"
        error={state.field === "password" ? state.error : undefined}
      >
        <TextInput
          id="join-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          dir="ltr"
          className="text-start"
        />
      </Field>

      <Field
        label="קוד הקמפ"
        htmlFor="join-code"
        hint="מי שהזמין אתכם יודע מה הקוד"
        error={state.field === "code" ? state.error : undefined}
      >
        <TextInput
          id="join-code"
          name="code"
          defaultValue={state.values?.code}
          required
          autoCapitalize="characters"
          dir="ltr"
          className="text-start uppercase tracking-[0.2em]"
        />
      </Field>

      <FormError state={state} />

      <StickerButton type="submit" accent="sun" size="lg" tilt disabled={pending} className="w-full">
        {pending ? "רגע…" : "להיכנס למטבח"}
        {!pending && <Glyph name="arrow" strokeWidth={2.4} />}
      </StickerButton>
    </form>
  );
}

function SignInForm() {
  const [state, action, pending] = useActionState(signIn, EMPTY);

  return (
    <form
      action={action}
      id="panel-signin"
      role="tabpanel"
      className="space-y-4"
      noValidate
    >
      <Field label="מייל" htmlFor="in-email" error={state.field === "email" ? state.error : undefined}>
        <TextInput
          id="in-email"
          name="email"
          defaultValue={state.values?.email}
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          className="text-start"
        />
      </Field>

      <Field label="סיסמה" htmlFor="in-password">
        <TextInput
          id="in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="text-start"
        />
      </Field>

      <FormError state={state} />

      <StickerButton type="submit" accent="pink" size="lg" tilt disabled={pending} className="w-full">
        {pending ? "רגע…" : "כניסה"}
        {!pending && <Glyph name="arrow" strokeWidth={2.4} />}
      </StickerButton>
    </form>
  );
}

function FormError({ state }: { state: AuthState }) {
  if (!state.error || state.field) return null;
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-md border-2 border-alarm bg-alarm/12 p-2.5 text-sm font-medium text-alarm"
    >
      <Glyph name="alert" strokeWidth={2.4} />
      {state.error}
    </p>
  );
}
