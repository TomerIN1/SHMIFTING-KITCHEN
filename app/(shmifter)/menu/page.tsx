import Image from "next/image";
import { requireUser } from "@/lib/auth/guard";
import { getMenu, groupByDay, type MenuMeal } from "@/lib/data/menu";
import { getLiveStandings } from "@/lib/data/votes";
import { LiveStandings } from "./LiveStandings";
import { getSettings, getUserWithProfile } from "@/lib/data/camp";
import { EmptyState } from "@/components/shmifting/EmptyState";
import { Glyph } from "@/components/shmifting/Glyph";
import { AllergyNotice } from "@/components/shmifting/Status";
import { HERO, MEAL_ART } from "@/components/shmifting/assets";
import { accentFor, ACCENTS } from "@/components/shmifting/accents";
import { hebrewDay, hebrewDate, cn } from "@/lib/utils";
import { mealTypeLabel, dishRoleLabel } from "@/lib/domain/categories";
import { allergenLabel, canEat } from "@/lib/domain/allergens";
import { dishAllergens } from "@/lib/domain/coverage";

export const metadata = { title: "התפריט — SHMIFTING KITCHEN" };

/* ============================================================================
   THE FINAL MENU REVEAL — Bible §16, Design Book §40

   "It should feel closer to revealing a festival lineup than opening a
    spreadsheet… It should not expose unnecessary kitchen management
    information."

   So: no statuses, no coverage percentages, no costs, no diner counts. Days
   are poster sections. The only operational thing that survives is the one
   thing a member genuinely needs — a quiet, personal note when a dish is not
   safe or not suitable for THEM (Bible §34: show personal information only
   where it is genuinely useful).
   ========================================================================= */

export default async function MenuPage() {
  const user = await requireUser();
  const [camp, menu, me, standings] = await Promise.all([
    getSettings(),
    getMenu(),
    getUserWithProfile(user.id),
    getLiveStandings(),
  ]);

  const revealed = Boolean(camp.menuRevealedAt);
  const meals = menu.filter((m) => m.status === "final");

  if (!revealed || meals.length === 0) {
    return (
      <div className="space-y-8">
        <MenuHero locked voting={Boolean(standings)} />

        {/* Before the reveal this page was a closed door with a note on it.
            While the camp is voting there is something real to show: its own
            choices, live. The reveal itself is untouched — this is the vote,
            not a preview of the Lead's work (Bible §16). */}
        {standings && standings.standings.length > 0 ? (
          <LiveStandings data={standings} />
        ) : (
          <EmptyState title="התפריט עוד לא נחשף">
            מנהל.ת המטבח עדיין סוגר.ת פינות. כשהתפריט יהיה מוכן — נחשוף אותו כאן
            במלואו, יום אחרי יום.
            {meals.length > 0 && (
              <span className="mt-2 block text-cream-dim">
                ({meals.length} ארוחות כבר סגורות מאחורי הקלעים.)
              </span>
            )}
          </EmptyState>
        )}
      </div>
    );
  }

  const myPattern = me?.profile?.dietaryPattern ?? "omnivore";
  const myAllergens = new Set((me?.allergies ?? []).map((a) => a.allergen));
  const days = groupByDay(meals);

  return (
    <div className="space-y-10">
      <MenuHero />

      {days.map((day, dayIndex) => (
        <section key={day.date.toISOString()} aria-labelledby={`day-${dayIndex}`}>
          <div className="mb-4 flex items-baseline gap-3">
            <h2
              id={`day-${dayIndex}`}
              className="shm-poster text-2xl text-cream sm:text-3xl"
            >
              {hebrewDay(day.date)}
            </h2>
            <span className="font-display text-base text-cream-dim">
              {hebrewDate(day.date)}
            </span>
            <span
              aria-hidden
              className={cn(
                "h-1 flex-1 rounded-full opacity-50",
                ACCENTS[accentFor(dayIndex)].bg,
              )}
            />
          </div>

          <ul className="grid gap-4 lg:grid-cols-2">
            {day.items.map((meal, i) => (
              <MealPoster
                key={meal.id}
                meal={meal}
                accentIndex={dayIndex + i}
                myPattern={myPattern}
                myAllergens={myAllergens}
              />
            ))}
          </ul>
        </section>
      ))}

      <footer className="pt-2 text-center">
        <p className="font-display text-lg text-cream-2/70">
          נתראה סביב הסיר.
        </p>
      </footer>
    </div>
  );
}

function MenuHero({
  locked = false,
  voting = false,
}: {
  locked?: boolean;
  /* The camp is still choosing. The hero must not announce a decision that
     has not happened — "THE MENU HAS SPOKEN" over a live vote is the product
     contradicting itself one scroll apart. */
  voting?: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-[24px_30px_22px_28px] border-[3px] border-ink shadow-[5px_6px_0_0_var(--color-ink)]">
      <Image
        src={locked ? HERO.locked : HERO.menu}
        alt=""
        priority
        placeholder="blur"
        className="absolute inset-0 h-full w-full object-cover"
        sizes="(max-width: 1024px) 100vw, 1100px"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(125%_105%_at_50%_28%,rgba(18,19,26,0.18),rgba(18,19,26,0.9)_74%)]"
      />
      <div className="relative px-5 py-11 text-center sm:px-9 sm:py-16">
        <p className="font-display text-xs tracking-[0.3em] text-sun">
          {voting ? "THE MENU IS BEING WRITTEN" : "THE MENU HAS SPOKEN"}
        </p>
        <h1 className="shm-poster mx-auto mt-2 max-w-lg text-3xl leading-tight text-cream sm:text-5xl">
          {voting ? "אתם כותבים את זה עכשיו." : "זה מה שנאכל ביחד."}
        </h1>
      </div>
    </section>
  );
}

function MealPoster({
  meal,
  accentIndex,
  myPattern,
  myAllergens,
}: {
  meal: MenuMeal;
  accentIndex: number;
  myPattern: string;
  myAllergens: Set<string>;
}) {
  const accent = ACCENTS[accentFor(accentIndex)];

  /* What this member personally cannot eat here. Computed for them only —
     nobody sees anybody else's restrictions (Bible §34). */
  const problems = meal.dishes
    .map((dish) => {
      const carried = dishAllergens({
        id: dish.id,
        name: dish.name,
        role: dish.role,
        dietary: dish.dietary,
        allergens: dish.allergens,
        ingredientAllergens: [
          ...new Set((dish.recipe?.items ?? []).flatMap((i) => i.ingredient.allergens)),
        ],
        hasRecipe: Boolean(dish.recipe),
      });
      const hits = carried.filter((a) => myAllergens.has(a));
      const patternClash = !canEat(myPattern, dish.dietary);
      return hits.length > 0 || patternClash
        ? { dish, hits, patternClash }
        : null;
    })
    .filter(Boolean) as {
    dish: (typeof meal.dishes)[number];
    hits: string[];
    patternClash: boolean;
  }[];

  const allergyHits = problems.filter((p) => p.hits.length > 0);
  const forMe = meal.dishes.filter((d) => canEat(myPattern, d.dietary));

  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-[20px_26px_18px_24px] border-[3px] border-ink shm-paper shadow-[5px_6px_0_0_var(--color-ink)]">
        <header
          className={cn(
            "flex items-center gap-3 border-b-[3px] border-ink px-4 py-3",
            accent.bg,
          )}
        >
          <Image
            src={MEAL_ART[meal.mealType]}
            alt=""
            className="h-11 w-11 shrink-0 object-contain drop-shadow-[2px_2px_0_rgba(11,12,16,0.4)]"
          />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/60">
              {mealTypeLabel(meal.mealType)}
            </p>
            <h3 className="font-display text-xl leading-tight text-ink">
              {meal.title}
            </h3>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-4">
          {meal.concept && (
            <p className="text-sm leading-relaxed text-ink/75">{meal.concept}</p>
          )}

          <ul className="space-y-1.5">
            {meal.dishes.map((dish) => {
              const clash = problems.find((p) => p.dish.id === dish.id);
              return (
                <li key={dish.id} className="flex items-baseline gap-2 text-[15px]">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full",
                      clash ? "bg-ink/20" : accent.bg,
                    )}
                  />
                  <span className={cn("min-w-0", clash ? "text-ink/45" : "text-ink")}>
                    {dish.name}
                    <span className="ms-2 text-[12px] text-ink/45">
                      {dishRoleLabel(dish.role)}
                    </span>
                    {dish.dietary === "vegan" && (
                      <span className="ms-1.5 text-[12px] text-good-deep">
                        טבעוני
                      </span>
                    )}
                    {dish.dietary === "vegetarian" && (
                      <span className="ms-1.5 text-[12px] text-good-deep">
                        צמחוני
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Design Book §43: never joke around this, never let it blend in. */}
          {allergyHits.length > 0 && (
            <AllergyNotice
              severity="severe"
              title="שימו לב — יש כאן משהו שאתם אלרגיים אליו"
              className="mt-1"
            >
              <ul className="space-y-0.5">
                {allergyHits.map((p) => (
                  <li key={p.dish.id}>
                    <strong className="font-semibold">{p.dish.name}</strong> —{" "}
                    {p.hits.map((h) => allergenLabel(h)).join(", ")}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-cream-2/80">
                יש עוד {forMe.length} מנות בארוחה הזו שמתאימות לכם. דברו עם מי
                שבמשמרת אם משהו לא ברור.
              </p>
            </AllergyNotice>
          )}

          {allergyHits.length === 0 && forMe.length === 0 && (
            <p className="mt-1 flex items-start gap-2 rounded-md border-2 border-attention/60 bg-attention/10 p-2.5 text-[13px] text-cream-2">
              <Glyph name="alert" className="mt-0.5 text-attention" strokeWidth={2.3} />
              <span>
                לא מצאנו כאן מנה שמתאימה לתזונה שלכם. אמרנו למנהל.ת המטבח.
              </span>
            </p>
          )}
        </div>
      </article>
    </li>
  );
}
