import { requireUser } from "@/lib/auth/guard";
import { SignpostNav, SignpostRail } from "@/components/shmifting/SignpostNav";
import { WordmarkLink } from "@/components/shmifting/Wordmark";
import { UserBadge } from "@/components/shmifting/UserBadge";
import { SoundToggle } from "@/components/shmifting/AmbientSound";
import { getRoundsForMember } from "@/lib/data/votes";
import { getSettings } from "@/lib/data/camp";

/* ============================================================================
   THE SHMIFTER SHELL — Design Book §27, 80% world / 20% interface.

   The shell is deliberately almost nothing: a signpost, a wordmark, and a
   name. Everything else on screen belongs to the page, so a member feels they
   walked into a world rather than logged into a tool.

   The counts on the signposts are real waiting work, never invented badges
   (CLAUDE.md §21).
   ========================================================================= */

export default async function ShmifterLayout({
  children,
}: LayoutProps<"/">) {
  const user = await requireUser();
  const [rounds, camp] = await Promise.all([
    getRoundsForMember(user.id),
    getSettings(),
  ]);

  const openUnvoted = rounds.filter(
    (r) => r.status === "open" && !r.hasVoted,
  ).length;
  /* Votes get a badge because a round closes: miss it and your say is gone,
     which is real information. Shifts deliberately do NOT. Taking an evening
     in the kitchen is an invitation, and a red count on the signpost turns it
     into a debt somebody is chasing you for — the opposite of what the shifts
     page says two clicks later (Bible §21: no badges that are not real). */
  const badges: Record<string, number> = {};
  if (openUnvoted > 0) badges["/vote"] = openUnvoted;

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print sticky top-0 z-40 border-b-2 border-ink/70 bg-charcoal/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <WordmarkLink className="w-[132px] sm:w-[160px]" />
          <div className="flex items-center gap-2">
            {/* Only the button. The player itself lives in the root layout so
                it never unmounts — see AmbientSoundProvider in app/layout.tsx.
                Kitchen HQ deliberately has no such button, because it is
                silent (§28). */}
            <SoundToggle />
            <UserBadge user={user} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-8 px-4 pb-28 pt-6 sm:px-6 lg:pb-16">
        <SignpostNav badges={badges} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <SignpostRail badges={badges} />
    </div>
  );
}
