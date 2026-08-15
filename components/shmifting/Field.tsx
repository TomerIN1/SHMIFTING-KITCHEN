import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Glyph } from "./Glyph";

/* ============================================================================
   FORM CONTROLS — Design Book §37
   "Forms should feel warm rather than bureaucratic… However: labels must
    remain clear; errors must remain clear; keyboard interaction must work;
    selection must be obvious."

   So the warmth lives in the voice and the paper, and the mechanics stay
   completely ordinary: real <label for>, real <input>, real error text tied
   with aria-describedby.
   ========================================================================= */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
  optional,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor: string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-2 font-display text-[15px] text-cream"
      >
        {label}
        {optional && (
          <span className="text-xs font-normal text-cream-dim">
            (לא חובה)
          </span>
        )}
      </label>
      {hint && (
        <p id={`${htmlFor}-hint`} className="text-[13px] leading-snug text-cream-2/70">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-[13px] font-medium text-alarm"
        >
          <Glyph name="alert" strokeWidth={2.4} />
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL = [
  "w-full rounded-[11px_13px_10px_12px] border-[2.5px] border-ink",
  "bg-cream px-3.5 py-2.5 text-ink placeholder:text-ink/35",
  "shadow-[3px_3px_0_0_var(--color-ink)]",
  "transition-shadow focus:shadow-[1px_1px_0_0_var(--color-ink)]",
  "focus:outline-none focus-visible:outline-none",
  "focus:ring-[3px] focus:ring-sun",
  "disabled:opacity-50",
].join(" ");

export function TextInput({ className, ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={cn(CONTROL, className)} />;
}

export function TextArea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea {...rest} className={cn(CONTROL, "min-h-24 resize-y", className)} />
  );
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select {...rest} className={cn(CONTROL, "appearance-none pe-9", className)}>
      {children}
    </select>
  );
}

/* Dense variant for Kitchen HQ, where a table row may hold six of these and
   sticker shadows would turn the screen into noise (Design Book §28). */
const TOOL_CONTROL = [
  "w-full rounded-[7px_9px_6px_8px] border-2 border-charcoal-5",
  "bg-charcoal-3 px-2.5 py-1.5 text-sm text-cream placeholder:text-cream-dim/60",
  "transition-colors hover:border-cream-dim",
  "focus:border-sun focus:outline-none focus:ring-2 focus:ring-sun/40",
  "disabled:opacity-45",
].join(" ");

export function ToolInput({ className, ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={cn(TOOL_CONTROL, className)} />;
}

export function ToolSelect({
  className,
  children,
  ...rest
}: ComponentProps<"select">) {
  return (
    <select {...rest} className={cn(TOOL_CONTROL, "appearance-none pe-7", className)}>
      {children}
    </select>
  );
}

export function ToolTextArea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...rest}
      className={cn(TOOL_CONTROL, "min-h-20 resize-y", className)}
    />
  );
}

/* ---------------------------------------------------------------------------
   CHOICE — an illustrated selection state (Design Book §37) built on a real
   radio or checkbox, so keyboard and screen readers get the standard control
   and the eye gets a sticker.
   ------------------------------------------------------------------------ */

export function Choice({
  type = "radio",
  name,
  value,
  defaultChecked,
  checked,
  onChange,
  title,
  detail,
  glyph,
  checkedBg = "peer-checked:bg-sun",
  className,
}: {
  type?: "radio" | "checkbox";
  name: string;
  value: string;
  /* Uncontrolled by default; pass `checked` + `onChange` to control it.
     Either way the underlying element is a real input, so the keyboard,
     the label association and screen readers work without any help. */
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  title: ReactNode;
  detail?: ReactNode;
  glyph?: ReactNode;
  /* A complete Tailwind class — never interpolated, or it would not exist in
     the generated CSS. */
  checkedBg?: string;
  className?: string;
}) {
  const controlled = checked !== undefined;
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-[14px_17px_12px_16px]",
        "border-[2.5px] border-charcoal-5 bg-charcoal-2 p-3.5",
        "transition-all duration-150",
        "hover:border-cream-dim",
        "has-[:checked]:border-ink has-[:checked]:bg-cream has-[:checked]:text-ink",
        "has-[:checked]:shadow-[4px_5px_0_0_var(--color-ink)]",
        "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-sun",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        {...(controlled
          ? { checked, onChange: (e) => onChange?.(e.target.checked) }
          : { defaultChecked })}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-[2.5px] border-ink",
          type === "radio" ? "rounded-full" : "rounded-[6px_8px_5px_7px]",
          "bg-charcoal-4 text-transparent",
          "peer-checked:text-ink",
          checkedBg,
        )}
      >
        <Glyph name="check" strokeWidth={3.2} className="text-[13px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-display text-[15px] leading-tight text-cream group-has-[:checked]:text-ink">
          {glyph}
          {title}
        </span>
        {detail && (
          <span className="mt-0.5 block text-[13px] leading-snug text-cream-2/70 group-has-[:checked]:text-ink/65">
            {detail}
          </span>
        )}
      </span>
    </label>
  );
}
