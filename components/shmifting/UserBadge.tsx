import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { Glyph } from "./Glyph";
import type { User } from "@/lib/db/schema";

/* ============================================================================
   USER BADGE — the only chrome either experience carries.

   Design Book §34: "Avoid filling the top of screens with navigation chrome…
   unless the task genuinely requires them." So: who you are, one door, and a
   way out. Nothing else.

   The door is context-dependent, and that matters. The Kitchen Lead is also a
   camp member — they have a profile, they vote, they take shifts. Crossing
   between the two experiences is a normal thing to do in both directions, so
   each side shows the way to the other. Without this, Kitchen HQ is a room
   with no handle on the inside.
   ========================================================================= */

export function UserBadge({
  user,
  context = "member",
}: {
  user: User;
  /* Which experience this badge is sitting in. */
  context?: "member" | "hq";
}) {
  const initial = user.name.trim().charAt(0);
  const inHq = context === "hq";

  /* From the camp side, only a Kitchen Lead has anywhere else to go.
     From inside HQ, everybody here is a Lead, so the door is always shown. */
  const showDoor = inHq || user.role === "admin";

  return (
    <div className="no-print flex items-center gap-2">
      {showDoor && (
        <Link
          href={inHq ? "/" : "/hq"}
          title={inHq ? "חזרה לצד של הקמפ" : "לניהול המטבח"}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-[9px_11px_8px_10px] border-2 border-charcoal-5 bg-charcoal-3 px-2.5 py-1.5 text-xs font-medium text-cream-2 transition-colors hover:border-sun hover:text-sun"
        >
          <Glyph name={inHq ? "arrow" : "pot"} strokeWidth={2} />
          {/* Always labelled. A bare arrow beside an avatar reads as browser
              "back", and there is room for the words even at 390px once the
              status strip has folded away. */}
          {inHq ? "חזרה לקמפ" : "מטבח HQ"}
        </Link>
      )}

      <span className="flex items-center gap-2 rounded-full border-2 border-ink bg-cream-3 py-1 pe-1 ps-3 text-ink">
        <span className="hidden max-w-[9rem] truncate text-xs font-medium sm:inline">
          {user.name}
        </span>
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-lavender font-display text-sm text-ink"
        >
          {initial}
        </span>
        <span className="sr-only">{user.name}</span>
      </span>

      <form action={signOut}>
        <button
          type="submit"
          aria-label="להתנתק"
          title="להתנתק"
          className="flex h-9 w-9 items-center justify-center rounded-[9px_11px_8px_10px] border-2 border-charcoal-5 text-cream-dim transition-colors hover:border-alarm hover:text-alarm"
        >
          <Glyph name="exit" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
