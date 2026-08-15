import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { Glyph } from "./Glyph";
import type { User } from "@/lib/db/schema";

/* The only chrome the Shmifter experience carries. Design Book §34: "Avoid
   filling the top of screens with navigation chrome… unless the task genuinely
   requires them." Who you are, a way out, and — only for the Kitchen Lead —
   the door to HQ. */

export function UserBadge({ user }: { user: User }) {
  const initial = user.name.trim().charAt(0);

  return (
    <div className="no-print flex items-center gap-2">
      {user.role === "admin" && (
        <Link
          href="/hq"
          className="flex items-center gap-1.5 rounded-[9px_11px_8px_10px] border-2 border-charcoal-5 bg-charcoal-3 px-2.5 py-1.5 text-xs font-medium text-cream-2 transition-colors hover:border-sun hover:text-sun"
        >
          <Glyph name="pot" strokeWidth={2} />
          מטבח HQ
        </Link>
      )}

      <span className="flex items-center gap-2 rounded-full border-2 border-ink bg-cream-3 py-1 pe-1 ps-3 text-ink">
        <span className="max-w-[9rem] truncate text-xs font-medium">
          {user.name}
        </span>
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-lavender font-display text-sm text-ink"
        >
          {initial}
        </span>
      </span>

      <form action={signOut}>
        <button
          type="submit"
          aria-label="להתנתק"
          title="להתנתק"
          className="flex h-9 w-9 items-center justify-center rounded-[9px_11px_8px_10px] border-2 border-charcoal-5 text-cream-dim transition-colors hover:border-alarm hover:text-alarm"
        >
          <Glyph name="arrow" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
