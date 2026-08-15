import Image from "next/image";
import type { ReactNode } from "react";
import { HERO } from "./assets";
import { cn } from "@/lib/utils";

/* ============================================================================
   EMPTY STATE — Bible §39
   "These states should explain what is happening rather than look broken."

   Every empty state names the thing that has not happened yet and says who it
   is waiting on. None of them say "no data".
   ========================================================================= */

export function EmptyState({
  title,
  children,
  action,
  className,
  compact = false,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px_28px_20px_26px] border-[3px] border-ink text-center",
        "shadow-[5px_6px_0_0_var(--color-ink)]",
        className,
      )}
    >
      <Image
        src={HERO.empty}
        alt=""
        placeholder="blur"
        className="absolute inset-0 h-full w-full object-cover"
        sizes="(max-width: 1024px) 100vw, 900px"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(100%_90%_at_50%_45%,rgba(18,19,26,0.55),rgba(18,19,26,0.93)_78%)]"
      />
      <div
        className={cn(
          "relative mx-auto flex max-w-md flex-col items-center gap-3 px-6",
          compact ? "py-10" : "py-16",
        )}
      >
        <h2 className="shm-poster text-2xl leading-tight text-cream sm:text-3xl">
          {title}
        </h2>
        {children && (
          <div className="text-sm leading-relaxed text-cream-2/85">
            {children}
          </div>
        )}
        {action}
      </div>
    </div>
  );
}

/* A quieter version for inside Kitchen HQ panels, where a full illustrated
   poster in the middle of a table would be noise (Design Book §28). */
export function PanelEmpty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <p className="max-w-sm text-sm leading-relaxed text-cream-dim">
        {children}
      </p>
      {action}
    </div>
  );
}
