import Link from "next/link";
import { getSettings, getBreakdown } from "@/lib/data/camp";
import { getMenuStats, getMenu } from "@/lib/data/menu";
import { getShiftStats, getShifts } from "@/lib/data/shifts";
import { getShoppingList, getBudget } from "@/lib/data/shopping";
import { getReadiness } from "@/lib/data/readiness";
import { getRoundResults } from "@/lib/data/votes";
import {
  Metric,
  ExceptionRow,
  ProgressBar,
  HqHeading,
} from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { PanelEmpty } from "@/components/shmifting/EmptyState";
import { Glyph } from "@/components/shmifting/Glyph";
import { StatusChip } from "@/components/shmifting/Status";
import { dietaryLabel, restrictionLabel } from "@/lib/domain/allergens";
import { money, hebrewDay, peopleCount } from "@/lib/utils";
import { mealTypeLabel } from "@/lib/domain/categories";

/* ============================================================================
   KITCHEN HQ OVERVIEW — Bible §30, §36

   "The Kitchen HQ should prioritize exceptions and unfinished work, not simply
    display data."

   So the page opens with WHAT NEEDS ATTENTION — a list of real, nameable
   problems, each linking to the exact screen that fixes it. The numbers come
   second. If nothing is wrong, the list says so plainly instead of
   manufacturing something to worry about.
   ========================================================================= */

export default async function HqOverview() {
  const [camp, people, menu, shiftStats, shifts, shopping, budget, readiness, rounds] =
    await Promise.all([
      getSettings(),
      getBreakdown(),
      getMenuStats(),
      getShiftStats(),
      getShifts(),
      getShoppingList(),
      getBudget(),
      getReadiness(),
      getRoundResults(),
    ]);

  const fullMenu = await getMenu();
  const openRounds = rounds.filter((r) => r.round.status === "open");

  /* Everything wrong, ranked by how much it would hurt in the desert. */
  const exceptions: {
    key: string;
    tone: "alarm" | "attention";
    title: string;
    detail: string;
    href: string;
    cta: string;
  }[] = [];

  if (people.unreviewedAllergies > 0) {
    exceptions.push({
      key: "allergies",
      tone: "alarm",
      title: `${people.unreviewedAllergies} אלרגיות מחכות לבדיקה שלכם`,
      detail:
        "אלרגיה שדווחה ולא נבדקה היא בדיוק המקום שבו דברים משתבשים במדבר.",
      href: "/hq/allergies",
      cta: "לבדוק עכשיו",
    });
  }

  if (menu.blockedDiners > 0) {
    exceptions.push({
      key: "blocked",
      tone: "alarm",
      title: `${menu.blockedDiners} מקרים שבהם למישהו אין מה לאכול`,
      detail:
        "יש ארוחה שבה אדם מסוים לא יכול לאכול אף מנה — בגלל אלרגיה או תזונה.",
      href: "/hq/menu",
      cta: "לתקן בתפריט",
    });
  }

  if (people.profilesMissing > 0) {
    exceptions.push({
      key: "profiles",
      tone: "attention",
      title: `${people.profilesMissing} פרופילי אוכל עדיין חסרים`,
      detail: "בלי פרופיל אנחנו מנחשים. נחשו מספיק פעמים ומישהו לא יאכל.",
      href: "/hq/people",
      cta: "לראות מי",
    });
  }

  if (shiftStats.understaffed > 0) {
    exceptions.push({
      key: "shifts",
      tone: "attention",
      title: `${shiftStats.understaffed} משמרות לא מאוישות`,
      detail: `חסרים ${shiftStats.positionsRequired - shiftStats.positionsFilled} אנשים בסך הכל.`,
      href: "/hq/shifts",
      cta: "לאייש",
    });
  }

  const missingRecipes = menu.dishesTotal - menu.dishesWithRecipe;
  if (missingRecipes > 0) {
    exceptions.push({
      key: "recipes",
      tone: "attention",
      title: `${missingRecipes} מנות בלי מתכון`,
      detail: "בלי מתכון אין כמויות, ובלי כמויות אין רשימת קניות.",
      href: "/hq/recipes",
      cta: "להשלים",
    });
  }

  if (menu.total - menu.final > 0) {
    exceptions.push({
      key: "menu",
      tone: "attention",
      title: `${menu.total - menu.final} ארוחות עוד לא סגורות`,
      detail: "רק ארוחות סופיות נכנסות לרשימת הקניות ולחבילת המטבח.",
      href: "/hq/menu",
      cta: "לסגור",
    });
  }

  if (shopping.summary.unassigned > 0) {
    exceptions.push({
      key: "shopping",
      tone: "attention",
      title: `${shopping.summary.unassigned} פריטי קנייה בלי אחראי`,
      detail: "פריט בלי שם עליו הוא פריט שאף אחד לא קונה.",
      href: "/hq/shopping",
      cta: "לחלק",
    });
  }

  if (budget.overBudget) {
    exceptions.push({
      key: "budget",
      tone: "attention",
      title: "התחזית חורגת מהתקציב",
      detail: `חריגה של ${money(budget.projected - budget.totalBudget, budget.currency)}.`,
      href: "/hq/budget",
      cta: "לבדוק",
    });
  }

  const nextShifts = shifts.filter((s) => s.missing > 0).slice(0, 4);

  return (
    <div className="space-y-6">
      <HqHeading
        title={`מטבח ${camp.campName}`}
        lead="מה שדורש טיפול, ואז המספרים. בסדר הזה."
        action={
          <Link
            href="/hq/readiness"
            className="flex items-center gap-2 rounded-[10px_12px_9px_11px] border-2 border-sun/60 bg-sun/10 px-3 py-2 text-sm font-medium text-sun transition-colors hover:bg-sun/20"
          >
            <Glyph name="check" strokeWidth={2.4} />
            מוכנות {readiness.score}%
          </Link>
        }
      />

      {/* ---- WHAT NEEDS ATTENTION ---------------------------------------- */}
      <Panel
        title="מה דורש טיפול"
        accent="pink"
        action={
          <span className="text-[12.5px] text-cream-dim">
            {exceptions.length === 0
              ? "אין חריגים"
              : `${exceptions.length} פריטים`}
          </span>
        }
      >
        {exceptions.length === 0 ? (
          <PanelEmpty>
            אין כרגע שום דבר פתוח שדורש את תשומת הלב שלכם. זה או שהמטבח באמת
            מסודר, או שעוד לא התחלתם.
          </PanelEmpty>
        ) : (
          <ul className="space-y-2 p-3">
            {exceptions.map((e) => (
              <ExceptionRow
                key={e.key}
                tone={e.tone}
                title={e.title}
                detail={e.detail}
                href={e.href}
                cta={e.cta}
              />
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- THE NUMBERS -------------------------------------------------- */}
      <section>
        <h2 className="mb-3 font-display text-lg text-cream">המטבח במספרים</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="אנשים בקמפ"
            value={people.total}
            sub={`${people.profilesComplete} מילאו פרופיל`}
            accent="lavender"
            href="/hq/people"
          />
          <Metric
            label="אלרגיות"
            value={people.allergyCount}
            sub={
              people.unreviewedAllergies > 0
                ? `${people.unreviewedAllergies} לא נבדקו`
                : "כולן נבדקו"
            }
            tone={people.unreviewedAllergies > 0 ? "alarm" : "done"}
            accent="pink"
            href="/hq/allergies"
          />
          <Metric
            label="ארוחות סגורות"
            value={`${menu.final}/${menu.total}`}
            sub={`${menu.dishesTotal} מנות`}
            accent="sun"
            href="/hq/menu"
          />
          <Metric
            label="תקנים במשמרות"
            value={`${shiftStats.positionsFilled}/${shiftStats.positionsRequired}`}
            sub={
              shiftStats.understaffed > 0
                ? `${shiftStats.understaffed} משמרות חסרות`
                : "הכל מאויש"
            }
            tone={shiftStats.understaffed > 0 ? "attention" : "done"}
            accent="dust-blue"
            href="/hq/shifts"
          />
          <Metric
            label="פריטי קנייה"
            value={`${shopping.summary.bought}/${shopping.summary.total}`}
            sub={`${shopping.summary.needed} עוד לא נקנו`}
            accent="peach"
            href="/hq/shopping"
          />
          <Metric
            label="תחזית עלות"
            value={money(budget.projected, budget.currency)}
            sub={
              budget.totalBudget > 0
                ? budget.overBudget
                  ? `חריגה של ${money(budget.projected - budget.totalBudget, budget.currency)}`
                  : `נשאר ${money(budget.remaining, budget.currency)}`
                : "עוד לא הוגדר תקציב"
            }
            tone={budget.overBudget ? "attention" : undefined}
            accent="terracotta"
            href="/hq/budget"
          />
          <Metric
            label="עלות לאדם"
            value={money(budget.projectedPerPerson, budget.currency)}
            sub={`מתוך ${money(budget.perPerson, budget.currency)} לאדם`}
            accent="sun"
            href="/hq/budget"
          />
          <Metric
            label="מוכנות"
            value={`${readiness.score}%`}
            sub={
              readiness.blockers.length > 0
                ? `${readiness.blockers.length} חוסמים נעילה`
                : "אפשר לנעול את המטבח"
            }
            tone={readiness.blockers.length > 0 ? "attention" : "done"}
            accent="good"
            href="/hq/readiness"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- DIETARY BREAKDOWN ----------------------------------------- */}
        <Panel title="מה הקמפ אוכל" accent="lavender">
          <div className="space-y-3 p-4">
            {people.patterns.map((p) => (
              <ProgressBar
                key={p.key}
                done={p.count}
                total={Math.max(people.profilesComplete, 1)}
                tone={p.key === "vegan" ? "good" : "dust-blue"}
                label={`${dietaryLabel(p.key)} — ${p.count} ${p.count === 1 ? "איש" : "אנשים"}`}
              />
            ))}
            {people.profilesMissing > 0 && (
              <p className="pt-1 text-[13px] text-attention">
                ועוד {peopleCount(people.profilesMissing)} שלא סיפרו לנו כלום.
              </p>
            )}
            {people.restrictions.length > 0 && (
              <div className="border-t-2 border-charcoal-4 pt-3">
                <p className="mb-1.5 text-[12.5px] font-medium text-cream-dim">
                  הגבלות נוספות
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {people.restrictions.map((r) => (
                    <li
                      key={r.key}
                      className="rounded-full border-2 border-charcoal-5 px-2 py-0.5 text-[12px] text-cream-2"
                    >
                      {restrictionLabel(r.key)} · {r.count}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        {/* ---- VOTING ------------------------------------------------------ */}
        <Panel
          title="הצבעות"
          accent="sun"
          action={
            <Link
              href="/hq/votes"
              className="text-[12.5px] text-cream-dim transition-colors hover:text-sun"
            >
              לכל ההצבעות
            </Link>
          }
        >
          {openRounds.length === 0 ? (
            <PanelEmpty>
              אין הצבעה פתוחה כרגע. הצבעה היא הדרך הכי טובה לגרום לקמפ להרגיש
              שהתפריט שלו.
            </PanelEmpty>
          ) : (
            <ul className="divide-y divide-charcoal-4">
              {openRounds.map((r) => (
                <li key={r.round.id} className="p-4">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <Link
                      href={`/hq/votes/${r.round.id}`}
                      className="font-display text-[15px] text-cream hover:text-sun"
                    >
                      {r.round.title}
                    </Link>
                    <StatusChip tone="live" size="sm">
                      פתוחה
                    </StatusChip>
                  </div>
                  <ProgressBar
                    done={r.voters}
                    total={Math.max(r.eligible, 1)}
                    label={`${r.voters} מתוך ${r.eligible} הצביעו`}
                  />
                  {r.nonVoters.length > 0 && (
                    <p className="mt-2 text-[12.5px] text-cream-dim">
                      לא הצביעו: {r.nonVoters.slice(0, 5).map((n) => n.name).join(", ")}
                      {r.nonVoters.length > 5 && ` ועוד ${r.nonVoters.length - 5}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---- UNDERSTAFFED SHIFTS ---------------------------------------- */}
        <Panel
          title="משמרות שחסרות אנשים"
          accent="dust-blue"
          action={
            <Link
              href="/hq/shifts"
              className="text-[12.5px] text-cream-dim transition-colors hover:text-sun"
            >
              לכל המשמרות
            </Link>
          }
        >
          {nextShifts.length === 0 ? (
            <PanelEmpty>כל המשמרות מאוישות. זה לא קורה הרבה.</PanelEmpty>
          ) : (
            <ul className="space-y-2 p-3">
              {nextShifts.map((s) => (
                <ExceptionRow
                  key={s.id}
                  tone={s.filled === 0 ? "alarm" : "attention"}
                  glyph="clock"
                  title={`${mealTypeLabel(s.mealType)} · ${hebrewDay(s.date)}`}
                  detail={`${s.filled} מתוך ${s.requiredPeople} — חסרים ${s.missing}`}
                  href="/hq/shifts"
                  cta="לאייש"
                />
              ))}
            </ul>
          )}
        </Panel>

        {/* ---- MENU AT A GLANCE -------------------------------------------- */}
        <Panel
          title="התפריט"
          accent="terracotta"
          action={
            <Link
              href="/hq/menu"
              className="text-[12.5px] text-cream-dim transition-colors hover:text-sun"
            >
              לתכנון התפריט
            </Link>
          }
        >
          {fullMenu.length === 0 ? (
            <PanelEmpty>
              עוד לא תוכננו ארוחות. כאן מתחיל כל השאר — הכמויות, הקניות והתקציב
              נגזרים מהתפריט.
            </PanelEmpty>
          ) : (
            <ul className="divide-y divide-charcoal-4">
              {fullMenu.slice(0, 6).map((meal) => (
                <li
                  key={meal.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/hq/menu/${meal.id}`}
                      className="block truncate text-sm text-cream hover:text-sun"
                    >
                      {meal.title}
                    </Link>
                    <p className="text-[12px] text-cream-dim">
                      {mealTypeLabel(meal.mealType)} · {hebrewDay(meal.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {meal.coverage.blockedCount > 0 && (
                      <StatusChip tone="alarm" size="sm">
                        {meal.coverage.blockedCount} חסומים
                      </StatusChip>
                    )}
                    <StatusChip
                      tone={meal.status === "final" ? "done" : "idle"}
                      size="sm"
                    >
                      {meal.status === "final"
                        ? "סופית"
                        : meal.status === "review"
                          ? "בבדיקה"
                          : "טיוטה"}
                    </StatusChip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
