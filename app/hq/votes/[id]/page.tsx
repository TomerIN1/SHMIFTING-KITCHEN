import Link from "next/link";
import { notFound } from "next/navigation";
import { getRounds, summariseRound } from "@/lib/data/votes";
import { getSettings } from "@/lib/data/camp";
import { HqHeading, Metric, ProgressBar } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { StatusChip } from "@/components/shmifting/Status";
import { Glyph } from "@/components/shmifting/Glyph";
import {
  RoundStatusControls,
  OptionEditor,
  RoundSettings,
} from "../VoteAdmin";
import { mealTypeLabel } from "@/lib/domain/categories";
import { hebrewFullDate, cn } from "@/lib/utils";

export default async function RoundPage({ params }: PageProps<"/hq/votes/[id]">) {
  const { id } = await params;
  const [rounds, camp] = await Promise.all([getRounds(), getSettings()]);
  const round = rounds.find((r) => r.id === id);
  if (!round) notFound();

  const result = await summariseRound(round);
  const locked = Boolean(camp.lockedAt);
  const max = Math.max(1, ...result.options.map((o) => o.flames));
  const closed = round.status === "closed";

  return (
    <div className="space-y-5">
      <Link
        href="/hq/votes"
        className="inline-flex items-center gap-1.5 text-[13px] text-cream-dim transition-colors hover:text-cream"
      >
        <Glyph name="arrow" strokeWidth={2.2} />
        לכל ההצבעות
      </Link>

      <HqHeading
        title={round.title}
        lead={
          <>
            {round.subtitle && <>{round.subtitle} · </>}
            {mealTypeLabel(round.mealType)}
            {round.mealDate && <> · {hebrewFullDate(round.mealDate)}</>}
          </>
        }
        action={
          <StatusChip
            tone={
              round.status === "open"
                ? "live"
                : closed
                  ? "done"
                  : "idle"
            }
          >
            {round.status === "open"
              ? "פתוחה"
              : closed
                ? "נסגרה"
                : "עוד לא נפתחה"}
          </StatusChip>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="השתתפות"
          value={`${result.voters}/${result.eligible}`}
          sub={`${result.participation}% מהקמפ`}
          tone={result.participation < 50 ? "attention" : "done"}
          accent="lavender"
        />
        <Metric
          label="להבות שחולקו"
          value={result.totalFlames}
          sub={`מתוך ${result.eligible * round.tokensPerVoter} אפשריות`}
          accent="sun"
        />
        <Metric label="רעיונות" value={result.options.length} accent="terracotta" />
        <Metric
          label="לא הצביעו"
          value={result.nonVoters.length}
          tone={result.nonVoters.length > 0 ? "attention" : "done"}
          accent="pink"
        />
      </div>

      {!locked && (
        <Panel title="מצב ההצבעה" accent="sun">
          <div className="p-4">
            <RoundStatusControls
              roundId={round.id}
              status={round.status}
              optionCount={round.options.length}
            />
          </div>
        </Panel>
      )}

      <Panel
        title="תוצאות"
        accent="terracotta"
        action={
          result.winner ? (
            <span className="text-[12.5px] text-good">
              מוביל: {result.options.find((o) => o.id === result.winner)?.title}
            </span>
          ) : result.totalFlames > 0 ? (
            <span className="text-[12.5px] text-attention">
              תיקו — אין מוביל ברור
            </span>
          ) : null
        }
      >
        <div className="space-y-3 p-4">
          {result.options.length === 0 ? (
            <p className="text-sm text-cream-dim">
              עוד אין רעיונות להצביע עליהם.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {result.options.map((option) => (
                <li key={option.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[13.5px]">
                    <span
                      className={cn(
                        option.id === result.winner
                          ? "font-semibold text-cream"
                          : "text-cream-2",
                      )}
                    >
                      {option.title}
                    </span>
                    <span className="tabular-nums text-cream-dim" dir="ltr">
                      {option.flames} להבות · {option.share}% · {option.voters}{" "}
                      אנשים
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-charcoal-4">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        option.id === result.winner ? "bg-sun" : "bg-dust-blue",
                      )}
                      style={{ width: `${(option.flames / max) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {closed && result.options.length > 0 && (
            <p className="rounded-md border-2 border-charcoal-4 border-s-[6px] border-s-lavender bg-charcoal-3 p-3 text-[13px] leading-snug text-cream-2">
              ההצבעה מיידעת את המטבח — היא לא מחליטה במקומכם. אם שיקולי תזונה,
              תקציב או לוגיסטיקה מובילים למסקנה אחרת, זו ההחלטה שלכם. אפשר
              לתעד את הסיבה בעמוד הארוחה.
            </p>
          )}
        </div>
      </Panel>

      <Panel
        title="רעיונות"
        accent="pink"
        action={
          <span className="text-[12.5px] text-cream-dim">
            {round.options.length} אפשרויות
          </span>
        }
      >
        <div className="p-4">
          <OptionEditor
            roundId={round.id}
            options={result.options}
            editable={!locked && round.status !== "closed"}
            showPromote={!locked && closed}
          />
        </div>
      </Panel>

      {result.nonVoters.length > 0 && (
        <Panel title="מי עוד לא הצביע" accent="dust-blue">
          <div className="p-4">
            <ProgressBar
              done={result.voters}
              total={Math.max(result.eligible, 1)}
              label="השתתפות"
              className="mb-3"
            />
            <ul className="flex flex-wrap gap-1.5">
              {result.nonVoters.map((n) => (
                <li
                  key={n.userId}
                  className="rounded-full border-2 border-charcoal-5 px-2.5 py-0.5 text-[12.5px] text-cream-2"
                >
                  {n.name}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}

      {!locked && (
        <Panel title="הגדרות ההצבעה" accent="cream">
          <div className="p-4">
            <RoundSettings
              round={{
                id: round.id,
                title: round.title,
                subtitle: round.subtitle,
                tokensPerVoter: round.tokensPerVoter,
                closesAt: round.closesAt
                  ? round.closesAt.toISOString().slice(0, 10)
                  : "",
              }}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
