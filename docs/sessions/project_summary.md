# SHMIFTING KITCHEN — PROJECT SUMMARY

**Durable state of the project. Read this first, every session (CLAUDE.md §0.1).**

Last updated: 2026-08-16 — end of session 2 (deployed, voting live, money modelled).

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
    equipment/            the kit: fridge, gas, knives — money that is not food
    settings/ pack/       pack = the printable Master Pack
    votes/[id]/[optionId] cost one evening before the camp has chosen it

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
    budget.ts             resolveBudget() — total vs per-head, one authority
    equipment.ts          kit vocabulary: categories, acquisition, status
  data/                   ★ server-only reads, all React-cached
    camp.ts menu.ts votes.ts shifts.ts shopping.ts recipes.ts readiness.ts
    costing.ts            what an un-won evening would cost (proposals only)
    equipment.ts          the kit list and its summary
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
  load-env.ts             ★ import FIRST in any script, before ../lib/db
  guard-remote.ts         refuses destructive scripts against the live camp
  seed.ts                 a believable, deliberately half-finished camp
  fresh-start.ts          clears the demo camp down to one Kitchen Lead
  seed-cuisines.ts        the 12 evenings on the vote board
  seed-ingredients.ts     104 priced ingredients
  seed-equipment.ts       27 pieces of kit
```

---

## 4. THE DATA MODEL

`People → Dietary Needs → Voting → Menu → Dishes → Recipes → Quantities → Shopping → Budget`, plus `People → Shifts`, all converging on **Readiness** (Bible §7).

Two rules shape the whole schema:

1. **Allergies are their own table**, never a profile column (Bible §11). They have their own review lifecycle: `reviewedAt`, `reviewedBy`, `reviewNote`. Editing an allergy **clears its review** — see `app/(shmifter)/profile/actions.ts`.
2. **Derived numbers are never stored.** The shopping list is aggregated on every read. What *is* stored is only what a human decided, in explicit nullable override columns: `recipeItems.scaledOverride`, `shoppingItems.quantityOverride`, `shoppingItems.actualCost`, `meals.overrideReason`. Null means "trust the calculation".

Tables: `users`, `foodProfiles`, `allergies`, `settings` (single row, id `camp`), `voteRounds`, `voteOptions`, `votes`, `meals`, `dishes`, `recipes`, `ingredients`, `recipeItems`, `shifts`, `shiftAssignments`, `shoppingItems`, `equipment`.

3. **A dish belongs to exactly one parent.** `dishes.mealId` and
   `dishes.voteOptionId` are both nullable and a CHECK constraint enforces that
   exactly one is set — on a meal it is being cooked, on a vote option it is a
   costed proposal. A dish with neither is an orphan nothing will ever cook; a
   dish with both is counted twice and surfaces as a shopping list quietly
   ordering double. See §6B.

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

### Ambient motion

`public/motion/hero-home.mp4` — 960 × 544, 5.04 s, 2.79 MB — plays behind the
countdown on the Shmifter Home. Produced by `npm run assets:animate` from
`hero-home.webp` via **Seedance 1.0 Pro** on fal.

Three things about it are load-bearing:

- **It loops.** `end_image_url` is set to the same frame as `image_url`, so the
  clip ends where it began. This needs the **Pro** endpoint — on Lite that field
  is deprecated and silently ignored. The one imperfection is the steam, whose
  ribbon differs slightly between first and last frame; invisible at full speed
  behind the gradient, obvious at quarter speed.
- **`aspect_ratio` is `"16:9"`, not `"auto"`, and the clip definition carries it.**
  The artwork is 3:2 and the enum has no 3:2, so something is always trimmed.
  "auto" chose 4:3 and trimmed the **sides**, cutting the eye in the sun in half
  and losing the cactus and carrot — the poster's composition (§12). 16:9 trims
  height instead, and matches the ~1.89 box the Home renders the poster in.
- **fal returns ~25 MB.** That never enters the repo. Transcode before committing:
  `avconvert -s big.mp4 -p Preset960x540 -o small.mp4 --replace --multiPass`
  (no ffmpeg on this machine; `avconvert` ships with macOS). A heavy dark
  gradient covers the clip, so the lost detail is detail nobody can see.

`AmbientVideo.tsx` is a **client** component for one reason: someone who asked
for reduced motion must not receive the element at all. Hiding it with CSS still
downloads and decodes every frame, which is 2.8 MB of desert mobile data and a
warm phone spent on something they will never see.

### Ambient sound

`components/shmifting/AmbientSound.tsx`, mounted in the **camp header only** —
Kitchen HQ is silent on purpose, because the Lead may sit in there for an hour
(Design Book §28). Three tracks from **mixkit.co**, transcoded to 112 kbps AAC
(`public/audio/shmift-0{1,2,3}.m4a`, 12.8 MB of source mp3 → 6.0 MB). The
mp3 originals are committed in `music-clip-shmifting/`.

**Sound is ON by default — a deliberate override of Design Book §51's "no
aggressive autoplay", decided by the product owner in session 2.** It is not an
oversight and must not be quietly reverted because the Design Book still says
otherwise; §51 has not been amended, so raise it with a human before changing
it back. Everything else in §51 is still obeyed literally: one button, no
player chrome, and nothing in the product gated behind audio.

**Browsers will not allow audible autoplay on a first visit**, whatever the
default says — so the component tries immediately, and if it is refused it arms
a one-shot listener for the member's first `pointerdown`/`keydown`/`touchstart`
anywhere on the page and starts then. That gesture bridge is the only way
sound can begin on a first visit; there is no code that gets around it.

The preference is a localStorage key (`shmifting:sound`) — a per-device comfort
setting, not camp data. Three states, and the distinction matters: **unset**
means never asked, so the default applies; **"on"** and **"off"** are the
member's own words and are always honoured. Turning it off also disarms the
pending gesture listener, or their very next click would restart the music they
just silenced.

**Tracks play one at a time, each to its own natural ending.** No cross-fade and
no early fade-out: these pieces are written to resolve, and cutting the tail is
what makes background music sound like a playlist. The only fades are in — a new
track lifts from silence over 2.6 s — and the deliberate 1.1 s fade-down when a
member switches sound off.

The credit sits in the Home footer with a link to mixkit.co. They do not require
it; a camp built on other people's generosity says so anyway.

### Artwork
21 assets generated with `gpt-image-1` (`scripts/generate-assets.mjs`), each carrying the full Shmifting visual contract in its prompt (Design Book §55). Optimised to WebP. The originals are archived in `public/assets/original/` (gitignored).

The **wordmark is not typeset** — it is cut out of Golden Reference 02 by `scripts/extract-wordmark.py`, because no webfont reproduces the drips and riso grain.

Two regions come out of that script, and they are cut differently on purpose.
The **wordmark** is keyed on luminance alone, because it is pink-to-lavender by
design and colour is the last thing that may be stripped from it. The **tagline**
(`GIFT OR SHMIFT?`) is additionally filtered to cream *components*: it arcs
through a crowd of decoration — a heart, a sun, stars, drips — that interleaves
with the glyphs' bounding boxes, so no rectangle can separate them. Grouping the
ink into connected blobs and judging each on its mean saturation leaves the
letters bit-for-bit untouched, which a per-pixel colour key does not: that eats
their warm grain and turns them grey.

Two thresholds in there are load-bearing and were measured, not guessed. Small
blobs must be *convincingly* cream (mean saturation < 55) while large ones need
only be roughly so (< 80) — that is what keeps the **dot of the question mark**
(30 px, saturation 40) while dropping the decorative mauve dot below the T
(52 px, saturation 67). And one orange leaf-tip physically touches the F, so it
joins that letter's component and survives every colour rule; it is the single
hard-coded `ERASE` rectangle, placed in the empty row between the leaf (ends
y=20) and the letters (start y=22).

`extract()` warns when ink still touches a crop edge, which is how the original
bug would have been caught: the tagline box was 48 px tall against ink spanning
59 px, so every glyph was sheared along the bottom.

---

## 6. WHAT IS COMPLETE

**Shmifter experience** — all of it: Home, food profile (with the deliberately serious allergy section), flame voting, shift selection, menu reveal with per-member allergy warnings.

**Kitchen HQ** — all of it: Overview, People, Allergy Center, Votes (+detail), Menu (+meal detail), Recipes (+recipe detail with live scaling), Shifts (grid + assignment), Shopping (aggregated master list), Budget, Readiness, LOCK THE KITCHEN, Settings, Master Print Pack.

**Domain intelligence** — dietary coverage, allergy→dish conflict detection, recipe scaling with practical rounding, cross-recipe ingredient aggregation, unit-aware cost conversion, budget projection vs actual, the readiness engine.

**Deployed and in use** — see §8B. Voting is live with a real member. The
ingredient catalogue (104) and equipment list (27) exist. An evening can be
costed before it wins, and the budget measures the menu against the pot minus
the kit.

**Not built:** recipes. Zero exist, and everything downstream of them — the
shopping list, ingredient volumes, the food half of the budget — is computed
and will appear the moment they do. This is the bottleneck and it is typing.

Build passes. TypeScript passes.

---

## 6B. THE MONEY AND THE MENU — how the chain actually runs

The core loop, and which half of it is automatic:

```
people → vote → menu → RECIPES → shopping → budget
                        ^^^^^^^
                    the only manual step
```

Everything except recipes is derived. That is why an empty camp shows a
shopping list and a budget of zero: they are computed correctly from nothing,
which looks identical to being broken. Say so on any screen that shows a total.

### Voting

One round, `הערבים של שמיפטינג`. Twelve whole evenings with closed menus, six
flames per member and **`maxPerOption: 1`** — so a vote is the sentence "these
are my six evenings" and the tally IS the menu, with nothing to interpret.

Two earlier designs were tried and deleted, and the reasoning matters if anyone
is tempted to reintroduce them. A round *per cuisine* with six mains inside
assumed the cuisines were already chosen, which left the Lead making the
interesting decision alone. Voting the cuisine *and* the main meant fourteen
screens before anybody had said a word about Wednesday.

Members can add their own evening (`voteOptions.suggestedBy`), credited by name,
with no approval queue — a queue turns a warm act into paperwork, and the Lead
can already delete anything. The name is the moderation.

`/menu` shows live standings while the round is open: rank, flames, how many
people, and a cut line after the number of evenings the camp will cook.
Aggregate only, never who voted for what — `getLiveStandings()` is a separate
query from `summariseRound()` precisely so the Lead's `nonVoters` chasing list
cannot leak into a member view by someone forgetting to strip a field.

### Costing an evening before it wins

`dishes.mealId` is nullable and `dishes.voteOptionId` exists. A dish hangs off
**exactly one** of them, enforced by a CHECK constraint rather than a validator:

- on a **meal** it is being cooked;
- on a **vote option** it is a costed proposal.

Proposals never reach the shopping list, the budget or the printed pack, because
all three walk the MENU. `getRecipes()` still walks the menu and must keep doing
so; only the single-recipe lookup searches wider, so the Lead can open what they
are costing. Promotion re-parents the dishes onto the new meal and the recipes
travel with them, because `recipes.dishId` points at the dish.

Costed at the camp head count, since a proposal has no date and that is who
would eat it.

### The budget

Two ways to express a ceiling, exactly one in force, resolved in
`lib/domain/budget.ts`:

- **`settings.budgetTotal`** — the pot finance hands down. When set it wins and
  the per-head figure derives from it. This is how the real conversation goes.
- **`settings.budgetPerPerson`** — a rate, used when no pot has been given.

Storing both as facts would produce two numbers that disagree the moment
somebody registers, with no way to know which was meant.

**Equipment is the other half of the money.** `equipment` is its own table, not
a shopping category: a fridge is rented, does not scale with head count, comes
back afterwards, and aggregating it by ingredient is nonsense. `acquisition`
distinguishes rent/buy from borrow/have, and only the first two cost anything —
"somebody is bringing it" is a commitment that can fall through, "we already own
it" cannot, and the Lead needs to see the difference in the week before
departure. Status cycles `needed → sourced → secured` in one click, because what
changes weekly is confidence, not price.

The vote projection measures the menu against **the pot minus the kit**.
Comparing a menu against the whole budget quietly promises money already spent
on a generator.

## 7. DECISIONS ALREADY MADE (do not re-litigate)

- **Only `final` meals reach the shopping list.** Pending meals are reported separately. Buying for an undecided dinner is exactly the error Bible §40 asks us to prevent.
- **The first person to join becomes the Kitchen Lead.** Otherwise setup would need a database console.
- **Camp members self-join with an invite code** (`settings.inviteCode`, editable in HQ) rather than being invited one by one.
- **Menu reveal is a manual act**, not a threshold. Revealing half a menu spends the moment for nothing (Bible §16).
- **Unlocking the kitchen requires typing `לפתוח את המטבח`** — deliberate, not casual (Bible §32).
- **An empty meal reports zero conflicts**, not "everyone is blocked". A meal with no dishes is a different problem, reported by a different check.
- **Motion is optional.** If `public/motion/*.mp4` is absent, the still poster is the whole experience.
- **Sound is ON by default** — an explicit product-owner override of Design Book §51's "no aggressive autoplay". §51 was NOT amended, so the code and the book disagree on purpose. Do not reconcile them by changing the code; ask a human.
- **Voting is one round of whole evenings, not a round per cuisine.** Two more elaborate models were built and deleted; the reasoning is in §6B and is worth reading before reintroducing either.
- **The vote is the decision, not an input to one.** Six flames, one per evening, so the tally IS the menu. This is why `maxPerOption` exists.
- **Equipment is not a shopping category.** It is its own table for reasons listed in §6B.
- **Prices in the seeded catalogues are estimates and are labelled as such.** Re-running a seed never overwrites a price a human corrected; that needs an explicit flag.
- **Removing a person is two operations, not one.** "Not coming" (`users.notComingAt`) drops them from every calculation but keeps their votes, because Bible §13 makes closed results final and the menu was chosen from those flames. Hard deletion exists separately, gated behind typing the person's exact name.

---

## 8. GOTCHAS

- **Tailwind v4 cannot see computed class names.** `accents.ts` writes every class out in full. Never build one with string interpolation or `.replace()` — that bug shipped once already.
- **Never drive audio volume from `requestAnimationFrame`.** rAF stops in a hidden tab, and a hidden tab is where background music actually lives — a track that ended in another tab would come back playing at volume 0. `AmbientSound` uses a `setInterval` loop with `dt` clamped to 1 s so a throttled tick still carries a real slice of the fade. Related: a cleanup that calls `cancelAnimationFrame` **must also null the stored handle**, or the "is the loop running?" guard stays true forever and the loop never restarts. React's dev double-mount triggers exactly that, and it cost an hour.
- **`server-only` breaks standalone `tsx` scripts.** Anything importing `lib/data/*` only runs inside Next. Verify domain logic through the browser, or write a script against `lib/domain/*` (pure) instead.
- **Ingredient cost is quoted per `ingredients.defaultUnit`.** Aggregation may land on a different unit in the same dimension (500 g rather than 0.5 kg). `convertUnitCost()` restates the price. Skipping it produced a ₪39,894 projection instead of ~₪1,600.
- **`drizzle-kit push` cannot add a column and its index or constraint in one pass.** It emits the index first and dies on the missing column. This happened twice in session 2; both tables were empty so they were rebuilt by hand with the target shape. **The next schema change will land on tables with real rows** — generate a migration, or `alter table … add column` manually and let push reconcile.
- **Scripts must `import "./load-env"` before `../lib/db`.** ES imports are hoisted, so calling `dotenv.config()` in the script body runs *after* the database connection has already been opened against the wrong file. It does not throw; it silently talks to the local SQLite file and reports success. Three separate debugging sessions in one day traced back to this.
- **Emails are stored lowercased** by the join schema. A script matching an email exactly updates zero rows and reports success unless it checks `rowsAffected`.
- **`.env` is off limits** (CLAUDE.md §0.3). `AUTH_SECRET` was added to `.env.local` instead, which Next also loads and which takes precedence.
- **Standalone scripts must load `.env.local` too, not just `.env`.** A bare `import "dotenv/config"` reads only `.env`. The working `FAL_KEY` lives in `.env.local`, so the animator spent an hour returning `403 · account locked, exhausted balance` — which reads exactly like a billing problem and is not one. `scripts/animate-assets.mjs` now loads `[.env.local, .env]` in that order, matching Next. Any new script touching secrets should do the same.
- **`create-next-app` overwrites `CLAUDE.md`** with a pointer to `AGENTS.md`. Ours now starts with `@AGENTS.md` and keeps the constitution below it.
- **Route groups collide with `app/page.tsx`.** The scaffold's placeholder had to be deleted for `(shmifter)/page.tsx` to own `/`.

---

## 8B. DEPLOYMENT — IT IS LIVE

**https://shmifting-kitchen.vercel.app** — Vercel project
`tomers-projects-982b087a/shmifting-kitchen`, deploying from `main` on push.

The generated `*-tomers-projects-*.vercel.app` deployment URLs sit behind Vercel
Deployment Protection and bounce to a Vercel login. That is not a broken deploy —
**test the production domain above**, which is public.

**Database: Turso** (`shmifting-tomerin1.aws-us-east-1.turso.io`), free Starter
plan, AWS `us-east-1` — deliberately the same region as the Vercel functions
(`iad1` = Northern Virginia). Almost every page runs several queries per
request, so function↔database latency is what matters; user↔function latency is
paid once. Ireland looks closer to Israel on a map and would be much worse.

It is **not** a Vercel Marketplace resource. The Marketplace install could not
get past `integration_terms_acceptance_required` — accepting in the browser
never registered, and `vercel integration installations` kept reporting none —
so the database was created directly at turso.tech and its two credentials set
as project env vars by hand. `vercel integration list` will say "No resources
found"; that is expected, not a missing piece.

### The camp as it stands

1 member (Tomer, admin) · invite code `SHMIFT2026` · departure 2 Nov 2026 ·
vote open until 1 Oct with 12 evenings and 6 flames each · 5 dinner shifts,
25 slots · 104 ingredients · 27 equipment items · **0 recipes** · budget unset.

Env vars on the project: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`,
`OPENAI_API_KEY`, `FAL_KEY`. Production and Preview are marked **Sensitive**,
which means nothing can read them back — `vercel env pull` returns the literal
string `[SENSITIVE]`. Development is not, so pull that scope if you need real
values. Schema was created with `npx drizzle-kit push` against Turso.

### The one dangerous consequence

`.env.local` now holds the live Turso credentials, so **every local script
points at the camp's real database** — `npm run db:seed` would have written 24
fictional people over real allergy data, and `db:fresh` would have deleted rows.
`scripts/guard-remote.ts` now refuses any destructive script whose
`TURSO_DATABASE_URL` is not a `file:` URL, unless `--allow-remote` is passed.
`--dry-run` is exempt because it only reports.

To develop against the local SQLite file again, comment `TURSO_DATABASE_URL` out
of `.env.local`.

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
