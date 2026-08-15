import Link from "next/link";
import { getRoundResults } from "@/lib/data/votes";
import { getSettings } from "@/lib/data/camp";
import { HqHeading, Metric, ProgressBar } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { PanelEmpty } from "@/components/shmifting/EmptyState";
import { StatusChip } from "@/components/shmifting/Status";
import { CreateRoundForm } from "./VoteAdmin";
import { mealTypeLabel } from "@/lib/domain/categories";
import { hebrewFullDate, cn } from "@/lib/utils";

export const metadata = { title: "הצבעות — Kitchen HQ" };

/* ============================================================================
   VOTING ADMINISTRATION — Bible §14
   Create, open, close, and read the weighted result.
   ========================================================================= */

export default async function HqVotesPage() {
  const [rounds, camp] = await Promise.all([getRoundResults(), getSettings()]);

  const open = rounds.filter((r) => r.round.status === "open");
  const totalVoters = rounds.reduce((s, r) => s + r.voters, 0);
  const defaultDate = (camp.festivalStart ?? new Date())
    .toISOString()
    .slice(0, 10);
  const locked = Boolean(camp.lockedAt);

  return (
    <div className="space-y-6">
      <HqHeading
        title="הצבעות"
        lead="הקמפ נותן להבות לרעיונות. אתם רואים לא רק מה נבחר — אלא כמה התלהבו מזה."
        action={!locked && <CreateRoundForm defaultDate={defaultDate} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="הצבעות בסך הכל" value={rounds.length} accent="sun" />
        <Metric
          label="פתוחות עכשיו"
          value={open.length}
          sub={open.length === 0 ? "אין הצבעה פעילה" : "הקמפ יכול להשפיע"}
          accent="terracotta"
        />
        <Metric
          label="השתתפויות"
          value={totalVoters}
          sub="סך כל המצביעים בכל הסבבים"
          accent="lavender"
        />
        <Metric
          label="להבות שחולקו"
          value={rounds.reduce((s, r) => s + r.totalFlames, 0)}
          accent="pink"
        />
      </div>

      {rounds.length === 0 ? (
        <PanelEmpty>
          עוד לא נוצרה אף הצבעה. הצבעה היא הדרך הכי פשוטה לגרום לקמפ להרגיש
          שהתפריט הוא שלו ולא שלכם.
        </PanelEmpty>
      ) : (
        <div className="space-y-4">
          {rounds.map((r) => {
            const winner = r.options.find((o) => o.id === r.winner);
            const max = Math.max(1, ...r.options.map((o) => o.flames));

            return (
              <Panel
                key={r.round.id}
                accent="sun"
                title={
                  <Link
                    href={`/hq/votes/${r.round.id}`}
                    className="transition-colors hover:text-sun"
                  >
                    {r.round.title}
                  </Link>
                }
                action={
                  <StatusChip
                    tone={
                      r.round.status === "open"
                        ? "live"
                        : r.round.status === "closed"
                          ? "done"
                          : "idle"
                    }
                    size="sm"
                  >
                    {r.round.status === "open"
                      ? "פתוחה"
                      : r.round.status === "closed"
                        ? "נסגרה"
                        : "לא נפתחה"}
                  </StatusChip>
                }
              >
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-[13px] text-cream-dim">
                      {mealTypeLabel(r.round.mealType)}
                      {r.round.mealDate && (
                        <> · {hebrewFullDate(r.round.mealDate)}</>
                      )}
                      {" · "}
                      {r.round.tokensPerVoter} להבות לכל אחד
                    </p>
                    {winner && (
                      <p className="text-[13px] text-good">
                        מוביל: <strong>{winner.title}</strong>
                      </p>
                    )}
                  </div>

                  <ProgressBar
                    done={r.voters}
                    total={Math.max(r.eligible, 1)}
                    label="השתתפות"
                  />

                  <ul className="space-y-2">
                    {r.options.map((option) => (
                      <li key={option.id}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                          <span
                            className={cn(
                              option.id === r.winner
                                ? "font-semibold text-cream"
                                : "text-cream-2",
                            )}
                          >
                            {option.title}
                          </span>
                          <span
                            className="tabular-nums text-cream-dim"
                            dir="ltr"
                          >
                            {option.flames} · {option.share}%
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-charcoal-4">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              option.id === r.winner ? "bg-sun" : "bg-dust-blue",
                            )}
                            style={{ width: `${(option.flames / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>

                  {r.nonVoters.length > 0 && (
                    <p className="text-[12.5px] text-cream-dim">
                      עוד לא הצביעו ({r.nonVoters.length}):{" "}
                      {r.nonVoters.slice(0, 8).map((n) => n.name).join(", ")}
                      {r.nonVoters.length > 8 && "…"}
                    </p>
                  )}

                  <Link
                    href={`/hq/votes/${r.round.id}`}
                    className="inline-block text-[12.5px] text-cream-dim underline transition-colors hover:text-sun"
                  >
                    לנהל את ההצבעה
                  </Link>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
