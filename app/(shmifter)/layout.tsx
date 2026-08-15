import { requireUser } from "@/lib/auth/guard";
import { SignpostNav, SignpostRail } from "@/components/shmifting/SignpostNav";
import { WordmarkLink } from "@/components/shmifting/Wordmark";
import { UserBadge } from "@/components/shmifting/UserBadge";
import { AmbientSound } from "@/components/shmifting/AmbientSound";
import { getRoundsForMember } from "@/lib/data/votes";
import { getMyShifts } from "@/lib/data/shifts";
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
  const [rounds, myShifts, camp] = await Promise.all([
    getRoundsForMember(user.id),
    getMyShifts(user.id),
    getSettings(),
  ]);

  const openUnvoted = rounds.filter(
    (r) => r.status === "open" && !r.hasVoted,
  ).length;
  const shiftsOpen =
    !camp.shiftsOpenAt || camp.shiftsOpenAt.getTime() <= Date.now();
  const shiftsNeeded = Math.max(0, camp.shiftsPerPerson - myShifts.length);

  const badges: Record<string, number> = {};
  if (openUnvoted > 0) badges["/vote"] = openUnvoted;
  if (shiftsOpen && shiftsNeeded > 0) badges["/shifts"] = shiftsNeeded;

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print sticky top-0 z-40 border-b-2 border-ink/70 bg-charcoal/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <WordmarkLink className="w-[132px] sm:w-[160px]" />
          <div className="flex items-center gap-2">
            {/* Lives in the layout, not on a page, so the music survives
                moving between the profile, the vote and the shifts. It is
                mounted on the camp side only — Kitchen HQ stays silent,
                because the Lead may sit in there for an hour (§28). */}
            <AmbientSound />
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
