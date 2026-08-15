# NEXT SESSION PLAN

**Immediate handover. Read this second, after `project_summary.md` (CLAUDE.md §0.1).**

Written: 2026-08-15, session 1 (the foundation session).
Updated: 2026-08-15, session 2 — see §0 for what session 2 changed.

---

## 0. WHAT SESSION 2 DID

**Ambient music — done and verified in the browser (was §2B, "blocked").**
The block dissolved: the user supplied three tracks from **mixkit.co**, so
nothing had to be generated and the `FAL_KEY`-for-audio question in CLAUDE.md
§0.3 never had to be answered. **Do not treat §0.3 as amended — it is not.**

The user gave two instructions that shaped the result, in this order:
1. *"when one clip end you lower vol, replace to the new treck increase vol
   again"*
2. *"you need to let one clip finish before playing the next one. one after
   one"*

The second overrode the first where they conflicted. The shipped behaviour:
each clip plays **all the way to its own ending**, then the next one loads and
lifts from silence over 2.6 s. There is no early fade-out and no overlap. The
only fade-down is when a member switches sound off.

Two real defects were found by watching the running product rather than reading
the code — both would have shipped silently:

- **The music played at volume 0 with the button lit.** Two causes, found in
  order. First, driving the fade from `play().then(…)` raced the end-of-track
  fade that was still animating. Then, more seriously, the unmount cleanup
  called `cancelAnimationFrame` without nulling the stored handle, so
  `ensureLoop`'s "already running" guard stayed true forever and the loop never
  started again — React's dev double-mount triggers this on every page load.
  Both are recorded as gotchas in `project_summary.md` §8.
- **The header wrapped onto two lines at 390 px.** The extra control pushed
  "מטבח HQ" over; fixed with `whitespace-nowrap` on the door link in
  `UserBadge.tsx`. Only the Kitchen Lead ever saw it, since the door is
  admin-only on the camp side.

**Video (§2C below) — still blocked, but re-aimed.** `scripts/animate-assets.mjs`
now uses **Seedance 1.0 Pro** instead of Kling, at 1080p, with `camera_fixed:
true` and `end_image_url` set to the same frame as `image_url` so the clip ends
where it began and loops with no seam. Read §2C for the account problem.

Not started this session: **§2A recipes-before-voting** and **§2D the screen-by-
screen QA**, including the empty-state pass. Those are still the next work.

---

## 1. WHERE THIS SESSION STOPPED

The whole product was built end to end from an empty repository, QA'd against a seeded camp, then the demo data was cleared.

`npm run build` passes. `npm run typecheck` passes. 21 routes, no console errors on any page visited.

**Nothing is half-written.** No stubbed function, no TODO standing in for logic.

### The database right now

The demo camp has been deleted. What is left:

| | |
|---|---|
| people | **1** — תומר נבו `<tomer@shmifting.camp>`, Kitchen Lead |
| expectedDiners | **1** (reset deliberately — it multiplies every recipe) |
| menu revealed | no |
| kitchen content | **still seeded fiction**: 7 meals, 11 recipes, 41 ingredients, 10 shifts, 8 supply items, 2 vote rounds |
| invite code | `SHMIFT` (unchanged — change before sharing) |

Clearing the rest is one command: `npm run db:fresh -- --keep=tomer@shmifting.camp --all`

### Fixed late in the session, by looking at screens rather than reading code

- recipe detail printed raw allergen keys (`legumes`, not `קטניות`)
- operational numerals were set in Suez One, whose zero and ₪ read as Hebrew letters — `₪0` looked like a word
- **Kitchen HQ had no way back to the camp side** — the header reused the member badge, which pointed at the page you were already on
- the Allergy Center listed people who had dropped out — the worst possible place to leak, since it is a safety sheet

---

## 2. WHAT THE USER ASKED FOR NEXT

Four things, in their words: *"continue checking each part of the app. adding music as well. prepering the recipies before voting. add video clips in the main page."*

Analysed below, hardest-decision-first rather than in the order asked.

---

### 2A. RECIPES BEFORE VOTING — needs a schema change

**What it means.** Today a vote option carries a free-text `dishes` column ("קארי עדשים ובטטה\nאורז בסמטי"). When a round closes, `promoteToMeal` in `app/hq/votes/actions.ts` splits those lines into bare dish rows with no recipes, and the Kitchen Lead writes every recipe from scratch afterwards.

The user wants the recipe to exist **before** the camp votes. That is a real improvement, not just reordering:

- the Lead sees each concept's **cost** before offering it
- the Lead sees each concept's **dietary coverage** — can the vegans eat Indian night?
- the Lead sees each concept's **allergens**, derived from real ingredients
- the winning concept converts into a meal with quantities already done

This is Bible §22 and §42 ("do the boring calculation so the humans can make the meaningful decision") applied one stage earlier.

**The blocker is structural.** A recipe cannot currently exist without a meal:

```
recipes.dishId  → NOT NULL, unique, references dishes
dishes.mealId   → NOT NULL, references meals
```

There is nowhere to hang a recipe that has not been scheduled yet.

**Recommended shape** (smallest change that reuses everything):

1. Make `dishes.mealId` **nullable**, and add a nullable `dishes.voteOptionId` referencing `voteOptions`. A dish then belongs to *either* a meal or a vote option; enforce "exactly one" in the domain layer.
2. Rewrite `promoteToMeal` to **re-parent** the option's dishes onto the new meal, carrying their recipes intact, instead of creating text stubs from `voteOptions.dishes`.
3. Give the HQ vote-option editor the dish/recipe UI the meal detail page already has — `app/hq/menu/[id]/DishEditor.tsx` should be extractable more or less as-is.
4. `analyseMeal()` in `lib/domain/coverage.ts` already takes a plain `DishInput[]`. Feed it a vote option's dishes and the coverage readout works for free — no new domain logic.
5. Keep `voteOptions.dishes` free text as a fallback for concepts the Lead has not costed yet. Do **not** require a recipe before a vote can be created; that would make voting heavier, and Bible §12 wants it to feel like a camp activity rather than a form.

**Watch out:** everything that counts dishes or recipes now has to say *which*. A library dish attached to a losing concept must never reach the shopping list, the readiness engine, or the Master Pack. `lib/data/recipes.ts` and `lib/data/shopping.ts` both walk the menu so they are naturally safe, but re-read `getMenuStats()` and the readiness checks after the change.

---

### 2B. MUSIC — ✅ DONE IN SESSION 2. Kept below for the reasoning only.

**The rest of this section is history.** It is preserved because the Design
Book analysis still governs any future change to the sound, and because the
`FAL_KEY`-for-audio question it raises was never answered and must not be
assumed. Resolution: the user supplied licensed tracks (option 1), so nothing
was generated. See §0.



Design Book §51 governs this completely, and is unusually prescriptive:

> Sound is atmospheric, not mandatory. No aggressive autoplay. User controls sound. Silence is always valid. Functional tasks must not require sound. **Avoid turning the product into a music player.**

So the shape is settled before any code is written: an opt-in, persistent, clearly-labelled toggle; silent by default on a first visit; nothing in the product ever gated behind audio.

Suggested atmosphere, from §51: desert ambient, subtle downtempo, warm psychedelic soundscape, gentle kitchen sounds.

**The blocker is where the audio comes from.** CLAUDE.md §0.3 says:

> `FAL_KEY` — used **only to bring existing assets to life**… You are not allowed to create new assets with FAL. FAL animates. OpenAI generates.

That rule was written about *artwork*. Music is neither "animating an existing asset" nor something the OpenAI image pipeline can produce. **Ask the user before generating any music with FAL.** The options:

1. They supply a licensed track — cleanest, and a camp probably has a friend who makes music, which is very Shmifting.
2. They explicitly extend the FAL permission to cover audio, and CLAUDE.md §0.3 is amended to say so.
3. Ambient sound is layered from short self-hosted samples rather than a composed track.

Do not quietly pick one. Committing generated music under an ambiguous permission is exactly what §0.3 exists to prevent.

**Where it goes once unblocked:** a small persistent control in the member header beside `UserBadge`. Store the preference in `localStorage`, not the database — it is a per-device comfort setting, not camp data. Kitchen HQ should probably stay silent entirely; §28 notes the Lead may work there for an hour.

---

### 2C. VIDEO CLIPS ON THE MAIN PAGE — still blocked on the FAL account

**Session 2 status.** The user asked for the main-page hero clip specifically,
using "seedance top quality", looping first frame to last. The script was
re-aimed accordingly and is ready to run:

- model is now `fal-ai/bytedance/seedance/v1/pro/image-to-video` at `1080p`;
- `camera_fixed: true` pins the camera natively instead of asking the prompt to;
- `end_image_url` is set to the **same frame** as `image_url`, so the clip ends
  where it began and the loop closes with no visible cut;
- the **Pro** endpoint is required — on Lite, `end_image_url` is deprecated and
  ignored, so the loop would silently not happen.

**It still cannot run.** Three attempts, before and after the model change:

```
403 {"detail":"User is locked. Reason: Exhausted balance."}
```

The user stated twice that the account has credits. The key is not the problem —
a wrong key returns 401, and this returns 403 with an account-level lock, so the
key authenticates and the account it belongs to is the one that is out of
balance. The likely explanation is that the credits were added to a **different
fal account** than the one this key belongs to, or that the lock has not cleared.
Resolving it needs someone to check fal.ai/dashboard/billing **while signed in as
the owner of this key** — it cannot be diagnosed from inside the repo, and
`.env` must not be read (CLAUDE.md §0.3).

Once it runs: `npm run assets:animate -- --only=hero-home`. Nothing else is
needed — `lib/motion.ts` detects the file at request time and the Home already
renders `AmbientPoster`.

The original session-1 notes follow.

- `scripts/animate-assets.mjs` defines three clips (`hero-home`, `hero-locked`, `flame-lit`) with prompts constrained to ambient motion only — no camera moves, no new objects (Design Book §48).
- `lib/motion.ts` detects `public/motion/<name>.mp4` at request time.
- `components/shmifting/AmbientPoster.tsx` plays the clip over the still poster, muted, looping, hidden entirely under `prefers-reduced-motion` (§50).
- **The Shmifter Home already uses `AmbientPoster`.** It comes alive with no code change.

```
403 {"detail":"User is locked. Reason: Exhausted balance."}
```

**To finish:** top up at fal.ai/dashboard/billing, then `npm run assets:animate`.

To add more clips: append to `CLIPS`, then swap that page's `<Image>` for `<AmbientPoster>`. Note `AmbientPoster` is an **async Server Component** — it cannot be dropped into a `"use client"` file. The lock screens in `app/hq/readiness/LockKitchen.tsx` are client components and still use plain `<Image>`; converting them means lifting the video decision up into the server page.

Keep it restrained. §48 asks for "life, not distraction", and a video behind every hero would be neither.

---

### 2D. CONTINUE CHECKING EACH PART OF THE APP

Screens QA'd in the browser this session, against real data:

welcome · home (desktop + mobile) · profile · vote · shifts · menu reveal · HQ overview · people · allergies · recipes list + detail · shopping · budget · readiness/lock · master pack · both headers.

**Not yet examined:**

| | |
|---|---|
| `/hq/votes/[id]` | round detail — renders, never inspected |
| `/hq/menu/[id]` | meal detail — renders, never inspected |
| `/hq/settings` | renders, never inspected |
| empty states | **the database is nearly empty right now — this is the ideal moment.** Every screen must explain itself rather than look broken (Bible §39) |
| mobile | only Home and the HQ header were checked at 390px. Every HQ screen is unverified on a phone |
| keyboard | tab order, focus rings, the flame board without a mouse, the `Choice` controls |
| print | the pack was verified structurally (7 page breaks, 27 avoid-break blocks, correct `@media print` rules) but never inspected as actual paginated output |
| RTL edges | mixed Hebrew/Latin in tables, long names, the `dir="ltr"` numeric spans |

**Start with empty states.** With one person and no votes, the product is in a state no screenshot has ever shown, and this will not be true again once real data arrives.

---

## 3. KNOWN RISKS AND OPEN QUESTIONS

- **The seeded kitchen content is still fiction** (ליל הודו, ערב הגעה, invented shekel prices). Decide whether to keep the ingredient catalogue as a starting library or clear everything with `--all`.
- **The Kitchen Lead's email is the seeded `tomer@shmifting.camp`.** There is no UI to change your own email. Use `npm run db:fresh -- --keep=… --email=…`, or build it — it is a normal account operation and its absence will be felt.
- **The invite code is still `SHMIFT`.** Change it in HQ → הגדרות before sharing.
- **No test suite.** `lib/domain/*` is pure and deterministic and was the source of both real bugs found this session (`convertUnitCost`, the empty-meal guard). That is where tests would pay for themselves first.
- **`drizzle-kit push` needs a TTY** when a column change is ambiguous. It failed on `arrivesOn` → `notComingAt` and the dev database had to be reset. On a deployment with real data, generate a migration instead. **This will bite again in 2A.**
- **Shift capacity is checked-then-inserted**, not transactional. Fine for tens of people; two phones racing for the last slot in the same millisecond could both win.
- **No rate limiting on sign-in.** Acceptable behind an invite code, not if this is ever public.
- **`practicalRound` always rounds up.** Deliberate — running out of onions in the desert is a real failure, one spare onion is not. The Lead overrides the line if they disagree (Bible §23).

---

## 4. ASSETS

21 in `public/assets/` (WebP), registered in `components/shmifting/assets.ts`. Nothing currently needed is missing.

**To add one:** append to `ASSETS` in `scripts/generate-assets.mjs`, run `npm run assets:generate && npm run assets:optimize`, export it from `assets.ts`. The style contract at the top of that script is what keeps new artwork inside the same universe (Design Book §55) — never a bare prompt, never an emoji or icon-pack substitute (CLAUDE.md §9).

Worth having, not blocking:
- per-concept artwork for the menu reveal (§40: "each major dinner concept may receive dedicated artwork"). `meals.imageUrl` and `voteOptions.imageUrl` exist and are unused — **2A makes these more valuable**, since a costed concept deserves a picture.
- a "hands making room" illustration for joining a shift (§49).

---

## 5. VERIFYING IT STILL WORKS

The database is nearly empty now, so the seeded walkthrough below needs a reset first:

```bash
npm run db:reset && npm run dev     # wipes, re-pushes schema, reseeds 24 people
```

Then walk this path — it exercises every system:

1. `/welcome` → sign in as `tomer@shmifting.camp` / `shmifting`.
2. `/hq` → the exception list should show ~7 items. **If it shows 27 "no food" cases, the empty-meal guard in `lib/domain/coverage.ts` has regressed.**
3. `/hq/allergies` → רועי's dairy allergy must list the two dishes it conflicts with. Live detection, not stored data.
4. `/hq/recipes/<any>` → change "כמות סופית לקמפ" on a line; it turns lavender, is labelled ידני, and the calculated number stays beside it.
5. `/hq/shopping` → בצל should aggregate to ~5.75 ק"ג. **If the projected total reads tens of thousands of shekels, `convertUnitCost` has regressed.**
6. `/hq/people` → mark somebody "לא מגיע.ה". Their allergy must vanish from `/hq/allergies`, their shifts must free up, their votes must survive.
7. `/hq/menu` → press THE MENU HAS SPOKEN, then visit `/menu` as a member.
8. `/hq/pack` → print preview. Charcoal and grain vanish; ink and structure remain.

Sanity numbers for the seeded camp: 24 people, 4 without a profile, 4 allergies (2 unreviewed), 7 meals (4 final), 40/43 shift positions filled, 35 shopping items, ~₪1,600 projected, readiness 53%.

To return to the cleared state afterwards:

```bash
npm run db:fresh -- --keep=tomer@shmifting.camp --name="תומר נבו"
```
