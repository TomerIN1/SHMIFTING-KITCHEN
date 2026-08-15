import Link from "next/link";
import { getPeople, getBreakdown, getSettings } from "@/lib/data/camp";
import { currentUser } from "@/lib/auth/session";
import { describeRemoval } from "./actions";
import { PersonActions } from "./PersonActions";
import { getShifts } from "@/lib/data/shifts";
import { getRoundResults } from "@/lib/data/votes";
import {
  HqHeading,
  Metric,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { StatusChip } from "@/components/shmifting/Status";
import { Glyph } from "@/components/shmifting/Glyph";
import {
  dietaryLabel,
  allergenLabel,
  restrictionLabel,
  severityLabel,
  SPICE_LEVELS,
} from "@/lib/domain/allergens";
import { cn, hebrewDate } from "@/lib/utils";

export const metadata = { title: "אנשים — Kitchen HQ" };

/* ============================================================================
   PEOPLE — Bible §30, §35, §36

   The Kitchen Lead's answer to "who am I feeding?". One row per person, with
   the four things that decide whether the kitchen can do its job: what they
   eat, what will hurt them, whether they voted, whether they took a shift.

   Bible §34 permits this view only here — the Kitchen Lead needs it because
   it is operationally necessary, and no member-facing screen ever shows it.
   ========================================================================= */

export default async function PeoplePage() {
  const [allPeople, breakdown, camp, shifts, rounds, me] = await Promise.all([
    getPeople(),
    getBreakdown(),
    getSettings(),
    getShifts(),
    getRoundResults(),
    currentUser(),
  ]);

  /* The roster splits in two: who is actually coming, and who dropped out.
     Only the first group is in any kitchen calculation. */
  const people = allPeople.filter((p) => !p.notComingAt);
  const notComing = allPeople.filter((p) => p.notComingAt);
  const adminCount = allPeople.filter((p) => p.role === "admin").length;

  /* What a hard delete would destroy, per person — computed up front so the
     confirmation can be specific rather than generic. */
  const removalCosts = Object.fromEntries(
    await Promise.all(
      allPeople.map(async (p) => [p.id, await describeRemoval(p.id)] as const),
    ),
  );

  const shiftCount = new Map<string, number>();
  for (const shift of shifts) {
    for (const a of shift.assignments) {
      shiftCount.set(a.userId, (shiftCount.get(a.userId) ?? 0) + 1);
    }
  }

  const votedIn = new Map<string, number>();
  const openRoundCount = rounds.filter(
    (r) => r.round.status === "open" || r.round.status === "closed",
  ).length;
  for (const r of rounds) {
    if (r.round.status === "upcoming") continue;
    for (const v of r.round.votes) {
      if (v.flames <= 0) continue;
      votedIn.set(v.userId, (votedIn.get(v.userId) ?? 0) + 1);
    }
  }
  /* A person may have several flame rows in one round; count rounds, not rows. */
  const roundsVoted = new Map<string, Set<string>>();
  for (const r of rounds) {
    if (r.round.status === "upcoming") continue;
    for (const v of r.round.votes) {
      if (v.flames <= 0) continue;
      const set = roundsVoted.get(v.userId) ?? new Set<string>();
      set.add(r.round.id);
      roundsVoted.set(v.userId, set);
    }
  }

  const incomplete = people.filter((p) => !p.profile?.completedAt);
  const wishes = people.filter((p) => p.profile?.wish?.trim());

  return (
    <div className="space-y-6">
      <HqHeading
        title="אנשים"
        lead={`${people.length} אנשים מגיעים. זה מי שאתם מאכילים.`}
      />

      {/* The head count follows the roster on its own now, so there is nothing
          to warn about unless the Lead has deliberately overridden it. When
          they have, say so plainly and show both numbers — an override is a
          decision worth seeing, not a drift worth "fixing" (Bible §23, §24). */}
      {camp.expectedDiners !== null && camp.expectedDiners !== people.length && (
        <div className="rounded-md border-2 border-attention/50 border-s-[6px] border-s-attention bg-attention/[0.07] p-3.5">
          <p className="flex items-center gap-2 font-display text-[15px] text-attention">
            <Glyph name="alert" strokeWidth={2.4} />
            המתכונים מוכפלים ל־{camp.expectedDiners} סועדים, אבל {people.length} אנשים מגיעים
          </p>
          <p className="mt-1 text-[13px] leading-snug text-cream-2/85">
            {camp.expectedDiners > people.length
              ? "אם זה בכוונה — מצוין, עודף אוכל במדבר זה לא אסון. אם לא, שווה לעדכן."
              : "התכנון מבשל פחות ממספר האנשים שמגיעים. שווה לבדוק."}{" "}
            <Link href="/hq/budget" className="underline hover:text-cream">
              לעדכן את מספר הסועדים
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="פרופילים שהושלמו"
          value={`${breakdown.profilesComplete}/${breakdown.total}`}
          sub={
            breakdown.profilesMissing > 0
              ? `${breakdown.profilesMissing} חסרים`
              : "כולם מילאו"
          }
          tone={breakdown.profilesMissing > 0 ? "attention" : "done"}
          accent="lavender"
        />
        <Metric
          label="טבעונים"
          value={breakdown.patterns.find((p) => p.key === "vegan")?.count ?? 0}
          sub={`${breakdown.patterns.find((p) => p.key === "vegetarian")?.count ?? 0} צמחונים`}
          accent="good"
        />
        <Metric
          label="אנשים עם אלרגיה"
          value={breakdown.allergyPeople}
          sub={`${breakdown.severeAllergies} חמורות`}
          tone={breakdown.severeAllergies > 0 ? "alarm" : undefined}
          accent="pink"
          href="/hq/allergies"
        />
        <Metric
          label="בלי משמרת"
          value={people.filter((p) => !shiftCount.get(p.id)).length}
          sub={`מכסה: ${camp.shiftsPerPerson} לאדם`}
          accent="dust-blue"
          href="/hq/shifts"
        />
      </div>

      {incomplete.length > 0 && (
        <Panel title="עוד לא מילאו פרופיל" accent="sun">
          <div className="p-4">
            <p className="mb-3 text-sm text-cream-2/80">
              בלי פרופיל אין לנו מושג מה הם אוכלים או ממה להיזהר. שווה לרדוף
              אחריהם.
            </p>
            <ul className="flex flex-wrap gap-2">
              {incomplete.map((p) => (
                <li
                  key={p.id}
                  className="rounded-[9px_11px_8px_10px] border-2 border-attention/60 bg-attention/10 px-2.5 py-1 text-sm text-cream"
                >
                  {p.name}
                  <span className="ms-1.5 text-[12px] text-cream-dim" dir="ltr">
                    {p.email}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}

      <Panel title="כל הקמפ" accent="lavender">
        <Table
          head={
            <>
              <Th>שם</Th>
              <Th>איך אוכל.ת</Th>
              <Th>אלרגיות</Th>
              <Th>הגבלות</Th>
              <Th>לא אוהב.ת</Th>
              <Th numeric>חריפות</Th>
              <Th numeric>הצבעות</Th>
              <Th numeric>משמרות</Th>
              <Th />
            </>
          }
        >
          {people.map((person) => {
            const complete = Boolean(person.profile?.completedAt);
            const severe = person.allergies.some(
              (a) => a.severity !== "avoid",
            );
            const shiftsTaken = shiftCount.get(person.id) ?? 0;
            const voted = roundsVoted.get(person.id)?.size ?? 0;

            return (
              <Tr key={person.id} tone={severe ? "alarm" : undefined}>
                <Td>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-[13px] text-ink",
                        complete ? "bg-lavender" : "bg-charcoal-5 text-cream-dim",
                      )}
                    >
                      {person.name.trim().charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-cream">
                        {person.name}
                      </span>
                      {person.role === "admin" && (
                        <span className="text-[11px] text-sun">
                          מנהל.ת מטבח
                        </span>
                      )}
                    </span>
                  </span>
                </Td>

                <Td>
                  {complete ? (
                    dietaryLabel(person.profile!.dietaryPattern)
                  ) : (
                    <StatusChip tone="attention" size="sm">
                      פרופיל חסר
                    </StatusChip>
                  )}
                </Td>

                <Td>
                  {person.allergies.length === 0 ? (
                    <span className="text-cream-dim">—</span>
                  ) : (
                    <ul className="flex flex-wrap gap-1">
                      {person.allergies.map((a) => (
                        <li key={a.id}>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[12px]",
                              a.severity === "avoid"
                                ? "border-attention/60 text-attention"
                                : "border-alarm text-alarm",
                            )}
                            title={severityLabel(a.severity).handling}
                          >
                            {a.severity !== "avoid" && (
                              <Glyph name="alert" strokeWidth={2.6} />
                            )}
                            {allergenLabel(a.allergen, a.label)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Td>

                <Td>
                  {(person.profile?.restrictions ?? []).length === 0 ? (
                    <span className="text-cream-dim">—</span>
                  ) : (
                    <span className="text-[13px]">
                      {person
                        .profile!.restrictions.map((r) => restrictionLabel(r))
                        .join(", ")}
                    </span>
                  )}
                </Td>

                <Td>
                  {(person.profile?.dislikes ?? []).length === 0 ? (
                    <span className="text-cream-dim">—</span>
                  ) : (
                    <span className="text-[13px] text-cream-2/75">
                      {person.profile!.dislikes.join(", ")}
                    </span>
                  )}
                </Td>

                <Td numeric>
                  {complete ? (
                    <span
                      title={SPICE_LEVELS[person.profile!.spiceLevel]?.he}
                      className="text-[13px]"
                    >
                      {person.profile!.spiceLevel}
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>

                <Td numeric>
                  <span
                    className={cn(
                      voted === 0 && openRoundCount > 0 && "text-attention",
                    )}
                    dir="ltr"
                  >
                    {voted}/{openRoundCount}
                  </span>
                </Td>

                <Td numeric>
                  <span
                    className={cn(
                      shiftsTaken < camp.shiftsPerPerson && "text-attention",
                    )}
                    dir="ltr"
                  >
                    {shiftsTaken}/{camp.shiftsPerPerson}
                  </span>
                </Td>

                <Td numeric>
                  {!camp.lockedAt && (
                    <PersonActions
                      userId={person.id}
                      name={person.name}
                      notComing={false}
                      isSelf={person.id === me?.id}
                      isLastAdmin={person.role === "admin" && adminCount <= 1}
                      cost={
                        removalCosts[person.id] ?? {
                          voteCount: 0,
                          closedRoundVotes: 0,
                          shiftCount: 0,
                          shoppingCount: 0,
                          allergyCount: 0,
                        }
                      }
                    />
                  )}
                </Td>
              </Tr>
            );
          })}
        </Table>
      </Panel>

      {notComing.length > 0 && (
        <Panel
          title="לא מגיעים לקמפ"
          accent="dust-blue"
          action={
            <span className="text-[12.5px] text-cream-dim">
              {notComing.length} אנשים
            </span>
          }
        >
          <div className="p-4">
            <p className="mb-3 max-w-2xl text-[13px] leading-relaxed text-cream-2/80">
              הם לא נספרים באף חישוב של המטבח — לא בכמויות, לא בכיסוי התזונתי,
              לא בדף האלרגיות ולא במכסת המשמרות. ההצבעות שלהם נשמרו, כי התפריט
              נבחר לפיהן.
            </p>
            <ul className="divide-y divide-charcoal-4">
              {notComing.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-charcoal-5 font-display text-[13px] text-cream-dim"
                    >
                      {person.name.trim().charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-cream-2">
                        {person.name}
                      </span>
                      <span className="block text-[12px] text-cream-dim">
                        יצא.ה מהרשימה ב־{hebrewDate(person.notComingAt!)}
                      </span>
                    </span>
                  </span>

                  {!camp.lockedAt && (
                    <PersonActions
                      userId={person.id}
                      name={person.name}
                      notComing
                      isSelf={person.id === me?.id}
                      isLastAdmin={person.role === "admin" && adminCount <= 1}
                      cost={
                        removalCosts[person.id] ?? {
                          voteCount: 0,
                          closedRoundVotes: 0,
                          shiftCount: 0,
                          shoppingCount: 0,
                          allergyCount: 0,
                        }
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}

      {/* Bible §10: "Free-text answers can later help the Kitchen Lead
          understand what the camp actually wants." This is that payoff. */}
      {wishes.length > 0 && (
        <Panel
          title="מה אנשים ביקשו"
          accent="peach"
          action={
            <span className="text-[12.5px] text-cream-dim">
              {wishes.length} משאלות
            </span>
          }
        >
          <ul className="grid gap-3 p-4 sm:grid-cols-2">
            {wishes.map((p) => (
              <li
                key={p.id}
                className="rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-3 p-3"
              >
                <p className="text-sm leading-relaxed text-cream-2">
                  “{p.profile!.wish}”
                </p>
                <p className="mt-1.5 text-[12px] text-cream-dim">— {p.name}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="pb-4 text-center text-[12.5px] text-cream-dim">
        המידע הזה גלוי רק כאן, למי שמנהל.ת את המטבח.{" "}
        <Link href="/hq/settings" className="underline hover:text-cream">
          מי רואה מה
        </Link>
      </p>
    </div>
  );
}
