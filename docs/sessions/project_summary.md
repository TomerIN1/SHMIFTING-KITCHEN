# SHMIFTING KITCHEN — PROJECT SUMMARY

**Durable state of the project. Read this first, every session (CLAUDE.md §0.1).**

Last updated: 2026-08-15 — end of session 1 (the foundation session).

---

## 1. WHAT THIS IS

A pre-Midburn kitchen planning product for Camp Shmifting.

Two experiences sharing one data model:

- **The Shmifter experience** (`/`) — warm, illustrated, minimal. A camp member fills a food profile, gives flames to meal ideas, takes kitchen shifts, and eventually sees the revealed menu.
- **Kitchen HQ** (`/hq`) — a dense operational tool for the Kitchen Lead. People, allergies, voting, menu, recipes, shifts, shopping, budget, readiness, settings, and the printed Master Pack.

The product's goal is to make itself unnecessary. It ends with **LOCK THE KITCHEN** and a printable **Kitchen Master Pack**.

Sources of truth (never override these): `/docs/SHMIFTING_PRODUCT_BIBLE.md`, `/design_book/SHMIFTING_DESIGN_BOOK.md`, `/design_book/golden_reference/`.

---

## 2. TECH STACK — AND WHY

| Choice | Why |
|---|---|
| **Next.js 16.3.1, App Router, Turbopack** | Server Components mean the dietary/allergy data never has to travel to the client. Server Actions remove an entire API layer. |
| **React 19.2** | Comes with Next 16. `useActionState` is the form pattern used everywhere. |
| **Tailwind CSS v4** | Design tokens live in `@theme` in `app/globals.css`, which keeps the Design Book palette in exactly one place. |
| **Drizzle ORM + libSQL/SQLite** | This is one camp of a few dozen people, not a scale problem (CLAUDE.md §25). Zero credentials locally; two env vars away from Turso in production. |
| **bcryptjs + jose (JWT cookie)** | No third-party auth provider. Camp members' medical data stays on our own database (Bible §34). No external bill, no dashboard, no vendor. |
| **zod** | Validation on every server action. |
| **No i18n library** | The product is Hebrew with deliberate English brand moments (Bible §45). A translation layer would add indirection for zero benefit. Hebrew strings live inline in JSX; domain vocabulary lives in `lib/domain/*`. |
| **No PDF library** | The Master Pack prints through the browser using the print stylesheet in `globals.css`. A PDF dependency would be one more thing to break. |
| **No icon library** | Custom hand-drawn glyphs in `components/shmifting/Glyph.tsx` (Design Book §53). |

### Breaking changes in Next 16 that bit us
- `cookies()`, `headers()`, `params`, `searchParams` are **async** — always `await`.
- `middleware.ts` is now `proxy.ts` (we don't use either; auth is guarded per-page).
- `revalidateTag` needs a second argument. We only use `revalidatePath`.

---

## 3. ARCHITECTURE — WHERE THINGS LIVE

```
app/
  layout.tsx              RTL root, Hebrew fonts (Heebo + Suez One), grain overlay
  globals.css             ★ ALL design tokens, utilities, and the print stylesheet
  welcome/                public entry: join with camp code, or sign in
  (shmifter)/             member experience — route group, no URL segment
    layout.tsx            signpost nav + header
    page.tsx              Home (the §27 visual checkpoint)
    profile/  vote/  shifts/  menu/
  hq/                     Kitchen HQ
    layout.tsx            sidebar/tabs + status strip; computes ALL nav alert counts
    page.tsx              Overview — exceptions first, numbers second
    people/ allergies/ votes/ menu/ recipes/ shifts/ shopping/ budget/
    readiness/            includes LOCK THE KITCHEN
    settings/ pack/       pack = the printable Master Pack

lib/
  db/schema.ts            ★ the data model, heavily commented
  db/index.ts             drizzle client
  auth/                   session.ts (JWT cookie), guard.ts, actions.ts
  domain/                 ★ pure functions, no DB — the product's intelligence
    allergens.ts          allergen catalogue, severity, dietary patterns, canEat()
    units.ts              unit conversion + practicalRound() (Bible §19)
    categories.ts         shopping categories, meal types, dish roles
    scaling.ts            recipe scaling: raw / practical / final
    coverage.ts           dietary coverage + allergy conflict detection
    shopping.ts           ingredient aggregation + cost conversion
    readiness.ts          the readiness engine
  data/                   ★ server-only reads, all React-cached
    camp.ts menu.ts votes.ts shifts.ts shopping.ts recipes.ts readiness.ts
  motion.ts               optional ambient video detection
  utils.ts                cn, Hebrew dates, money, plurals

components/
  shmifting/              the member visual language
    accents.ts            palette map — classes written out in full (Tailwind!)
    Glyph.tsx             hand-drawn icon set
    StickerButton.tsx     physical buttons + ToolButton for HQ
    surfaces.tsx          PaperCard / Panel / Statement / SectionTitle
    Status.tsx            StatusChip / Capacity / AllergyNotice
    SignpostNav.tsx       the signpost from Golden Reference 02
    Field.tsx             form controls (warm) + Tool* variants (dense)
    Wordmark.tsx, Countdown.tsx, EmptyState.tsx, AmbientPoster.tsx
    assets.ts             ★ static-import registry for all artwork
  hq/
    HqNav.tsx, primitives.tsx (Metric/ExceptionRow/Table/…), CoverageBadges.tsx

scripts/
  generate-assets.mjs     OpenAI → public/assets  (creates artwork)
  extract-wordmark.py     cuts the wordmark out of Golden Reference 02
  optimize-assets.mjs     PNG → WebP, 57.8 MB → 5.0 MB
  animate-assets.mjs      FAL → public/motion  (animates artwork only)
  seed.ts                 a believable, deliberately half-finished camp
  fresh-start.ts          clears the demo camp down to one Kitchen Lead
```

---

## 4. THE DATA MODEL

`People → Dietary Needs → Voting → Menu → Dishes → Recipes → Quantities → Shopping → Budget`, plus `People → Shifts`, all converging on **Readiness** (Bible §7).

Two rules shape the whole schema:

1. **Allergies are their own table**, never a profile column (Bible §11). They have their own review lifecycle: `reviewedAt`, `reviewedBy`, `reviewNote`. Editing an allergy **clears its review** — see `app/(shmifter)/profile/actions.ts`.
2. **Derived numbers are never stored.** The shopping list is aggregated on every read. What *is* stored is only what a human decided, in explicit nullable override columns: `recipeItems.scaledOverride`, `shoppingItems.quantityOverride`, `shoppingItems.actualCost`, `meals.overrideReason`. Null means "trust the calculation".

Tables: `users`, `foodProfiles`, `allergies`, `settings` (single row, id `camp`), `voteRounds`, `voteOptions`, `votes`, `meals`, `dishes`, `recipes`, `ingredients`, `recipeItems`, `shifts`, `shiftAssignments`, `shoppingItems`.

### Who is coming — `users.notComingAt`

Null means coming. This one column is what makes a dropout real, and **`getDiners()` in `lib/data/camp.ts` is the single place it is enforced** — every dietary calculation, the allergy centre, the breakdown, the shift quota and readiness all flow through it.

Two reads exist deliberately:
- `getPeople()` — everyone on record. Only for the roster manager itself (`/hq/people`) and role management (`/hq/settings`).
- `getActivePeople()` — only people coming. **This is what belongs in every person-picker and in the printed pack.** Assigning a shift to somebody who is not turning up is worse than leaving it unassigned, because it looks handled.

If you add a screen that lists or offers people, use `getActivePeople()`. The Allergy Center queries `allergies` directly and needed its own `notComingAt` guard — a safety sheet listing somebody who is not in the desert spends a cook's attention on a risk that is not there.

Marking somebody not-coming frees their shifts and un-assigns their shopping items, but **keeps their votes**: Bible §13 makes closed results final, and the menu was already chosen from those flames. Hard deletion exists separately for duplicates and test accounts, gated behind typing the person's exact name.

---

## 5. DESIGN SYSTEM

**Every colour was sampled from `design_book/golden_reference/02.png`**, not invented. The palette lives in the `@theme` block of `app/globals.css`.

- Canvas: `--color-charcoal #12131a` (GR02 measures rgb(17,19,23)); surfaces lift to `#2f303b`, near the Design Book's `#303030`.
- Palette: shmift-pink `#e8788e`, lavender `#a76db4`, sun `#f6a83c`, peach `#f58a46`, terracotta `#e4703f`, dust-blue `#748f9e`, cream `#f4e6c8`.
- **Reserved state colours** — `alarm`, `attention`, `good`. Nothing decorative may use them (Design Book §9).

**Typography split is functional, not stylistic.** Suez One (`font-display`) carries poster moments only. Operational numerals use Heebo, heavy and tabular — Suez One's zero and its ₪ read as Hebrew letters at a glance, so a budget of `₪0` looked like a word. Design Book §31 already forbids display type for dense operational content; this is that rule with teeth.

Visual grammar, expressed as utilities: `shm-outline` (2.5px ink border), `shm-lift` (hard offset shadow, never a blur), `shm-paper` (cream printed stock), `shm-panel` (charcoal HQ surface), `shm-poster` (display lettering), irregular border-radii everywhere. A riso grain overlay sits on `body::after`.

**Member vs Admin** (Design Book §27/§28) is enforced by which surface you reach for: `PaperCard` + `StickerButton` + tilt for members; `Panel` + `ToolButton` + no tilt for HQ.

**The one exception in HQ**: LOCK THE KITCHEN is allowed to be a poster (Design Book §71).

**Crossing between the two experiences.** `UserBadge` takes a `context` prop (`"member"` | `"hq"`) and shows the door to the *other* side: the camp header offers "מטבח HQ" to admins, the HQ header offers "חזרה לקמפ" to everyone. Both are needed — the Kitchen Lead is also a camp member with a profile, votes and shifts, so they move between the two sides constantly. Pass `context="hq"` in `app/hq/layout.tsx`; the default is `"member"`.

### Artwork
21 assets generated with `gpt-image-1` (`scripts/generate-assets.mjs`), each carrying the full Shmifting visual contract in its prompt (Design Book §55). Optimised to WebP. The originals are archived in `public/assets/original/` (gitignored).

The **wordmark is not typeset** — it is cut out of Golden Reference 02 by `scripts/extract-wordmark.py`, because no webfont reproduces the drips and riso grain.

---

## 6. WHAT IS COMPLETE

**Shmifter experience** — all of it: Home, food profile (with the deliberately serious allergy section), flame voting, shift selection, menu reveal with per-member allergy warnings.

**Kitchen HQ** — all of it: Overview, People, Allergy Center, Votes (+detail), Menu (+meal detail), Recipes (+recipe detail with live scaling), Shifts (grid + assignment), Shopping (aggregated master list), Budget, Readiness, LOCK THE KITCHEN, Settings, Master Print Pack.

**Domain intelligence** — dietary coverage, allergy→dish conflict detection, recipe scaling with practical rounding, cross-recipe ingredient aggregation, unit-aware cost conversion, budget projection vs actual, the readiness engine.

Build passes. TypeScript passes. 21 routes.

---

## 6B. PRODUCT DIRECTION — what the camp wants next

Stated by the user at the close of session 1. Recorded here so it survives, and
because two of these need a decision before any code:

1. **Recipes are prepared before voting.** Concepts should carry real recipes so
   the Lead can see cost, dietary coverage and allergens *before* offering them,
   and so the winner converts into a meal with quantities already done. Blocked
   by a schema constraint — `dishes.mealId` is NOT NULL, so no recipe can exist
   before a meal does. Design sketched in `next_session_plan.md` §2A.
2. **Ambient music**, governed entirely by Design Book §51: opt-in, silent by
   default, never gating a task, never a music player. Blocked on where the
   audio comes from — see `next_session_plan.md` §2B, which needs the user's
   answer before anything is generated.
3. **Video on the main page.** Already built end to end; waiting only on a FAL
   account balance.
4. **A systematic pass over every screen**, continuing the visual QA that found
   four real defects in session 1.

---

## 7. DECISIONS ALREADY MADE (do not re-litigate)

- **Only `final` meals reach the shopping list.** Pending meals are reported separately. Buying for an undecided dinner is exactly the error Bible §40 asks us to prevent.
- **The first person to join becomes the Kitchen Lead.** Otherwise setup would need a database console.
- **Camp members self-join with an invite code** (`settings.inviteCode`, editable in HQ) rather than being invited one by one.
- **Menu reveal is a manual act**, not a threshold. Revealing half a menu spends the moment for nothing (Bible §16).
- **Unlocking the kitchen requires typing `לפתוח את המטבח`** — deliberate, not casual (Bible §32).
- **An empty meal reports zero conflicts**, not "everyone is blocked". A meal with no dishes is a different problem, reported by a different check.
- **Motion is optional.** If `public/motion/*.mp4` is absent, the still poster is the whole experience.
- **Removing a person is two operations, not one.** "Not coming" (`users.notComingAt`) drops them from every calculation but keeps their votes, because Bible §13 makes closed results final and the menu was chosen from those flames. Hard deletion exists separately, gated behind typing the person's exact name.

---

## 8. GOTCHAS

- **Tailwind v4 cannot see computed class names.** `accents.ts` writes every class out in full. Never build one with string interpolation or `.replace()` — that bug shipped once already.
- **`server-only` breaks standalone `tsx` scripts.** Anything importing `lib/data/*` only runs inside Next. Verify domain logic through the browser, or write a script against `lib/domain/*` (pure) instead.
- **Ingredient cost is quoted per `ingredients.defaultUnit`.** Aggregation may land on a different unit in the same dimension (500 g rather than 0.5 kg). `convertUnitCost()` restates the price. Skipping it produced a ₪39,894 projection instead of ~₪1,600.
- **`.env` is off limits** (CLAUDE.md §0.3). `AUTH_SECRET` was added to `.env.local` instead, which Next also loads and which takes precedence.
- **`create-next-app` overwrites `CLAUDE.md`** with a pointer to `AGENTS.md`. Ours now starts with `@AGENTS.md` and keeps the constitution below it.
- **Route groups collide with `app/page.tsx`.** The scaffold's placeholder had to be deleted for `(shmifter)/page.tsx` to own `/`.

---

## 9. RUNNING IT

```bash
npm install
npm run db:push      # create/migrate the local SQLite file
npm run db:seed      # a believable camp, deliberately half-finished
npm run dev
```

Sign in with any seeded email, password `shmifting`.
Kitchen Lead: `tomer@shmifting.camp`. Camp invite code: `SHMIFT`.

```bash
npm run db:reset          # wipe and reseed
npm run typecheck
npm run build
npm run assets:generate   # OpenAI — only regenerates what is missing
npm run assets:optimize   # PNG → WebP
npm run assets:animate    # FAL — needs account balance

# going from demo data to a real camp
npm run db:fresh -- --keep=you@example.com --dry-run
npm run db:fresh -- --keep=you@example.com --name="Your Name" --email=real@you.com
npm run db:fresh -- --keep=you@example.com --all      # also wipe menu/recipes/shifts
```

`db:fresh` deletes every person except the one you keep, promotes them to
Kitchen Lead, and resets `expectedDiners` to 1 so no future recipe is silently
multiplied by a head count nobody chose. It also carries `--email`, because the
seed ships fake `@shmifting.camp` addresses and the product has no self-service
way to change your own email.
