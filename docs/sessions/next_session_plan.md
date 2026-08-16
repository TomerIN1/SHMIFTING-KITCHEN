# NEXT SESSION PLAN

**Immediate handover. Read this second, after `project_summary.md` (CLAUDE.md §0.1).**

Written at the end of session 2, 2026-08-16, and amended during session 3 the
same day. Session 2 was long: the product went from a local prototype to a
deployed camp with a real member, a live vote, and money in it. Session 3 has
so far only fixed the music — the budget work below is still the plan and has
not been started.

---

## 0. WHAT SESSION 3 DID SO FAR — THE MUSIC

The camp owner reported that opening the app in Chrome produced no music, and
asked for it to start on its own: *"the user needs to feel that the music starts
to play welcoming him."*

It was **not** only the browser autoplay policy. There was a real bug, found by
instrumenting a real Chrome:

> The "יש כאן מוזיקה — הקישו להפעלה" banner was **eating the very click that
> would have started the music.** Its container was `inset-x-0`, so any click in
> a 43px strip across the entire width of the screen was treated as "a tap on
> our own controls" and skipped — and because the gesture listeners were
> registered `{ once: true }`, that skipped click had already consumed them. One
> click near the top of the page and the music could never start again, however
> much the member clicked afterwards.

Fixed in `components/shmifting/AmbientSound.tsx` and its mount points:

1. **The banner is gone**, on the owner's instruction. No "tap to play"
   affordance may be reintroduced — see `project_summary.md` §7.
2. **The gesture bridge stays armed** until playback actually succeeds, and
   re-arms on every refusal. Listeners are in the capture phase.
3. **`click`, `pointerup`, `touchend` added** to the gesture list. iOS Safari
   does not grant permission on `touchstart`, and the camp is on phones.
4. **`preload="auto"`** for members who want sound, so the first gesture lands
   on a track that is ready instead of one still downloading.
5. **The player was hoisted into the root layout** (`AmbientSoundProvider`),
   split from its button (`SoundToggle`). It used to be mounted three times, so
   the audio element was rebuilt on every crossing and each rebuild could be
   refused afresh. Verified in Chrome: the element now survives client
   navigation intact.
6. **Kitchen HQ is silent again** (`SILENT_AREAS`), by the owner's explicit
   choice, reversing session 2. Entering HQ fades down and pauses mid-track;
   leaving resumes on the same bar. No sound button in the HQ header.

### What was verified, and what was not

Verified in the owner's real Chrome: the blocked state, then **one** real click
anywhere → `play()` called → `paused: false` and the button flips to
"לכבות את המוזיקה"; the audio element surviving `/` → `/hq` → `/` intact; HQ
paused at volume 0; resume on return. `npm run typecheck` and `npm run build`
both pass.

**Not verified: that sound is audible.** Media elements stall at `readyState 0`
in a Chrome driven over the DevTools Protocol — see the new gotchas in
`project_summary.md` §8. The file itself was proved healthy (correct atom order,
decodes via `decodeAudioData`, and Playwright's Chromium streams it to
`readyState 4`). **Someone should open the site normally and listen.**

### The honest limit, which no code removes

Chrome will not permit audible playback in a document that has never received a
user gesture, unless the origin has accumulated enough **Media Engagement**. So
on a genuine cold load the music starts at the member's first touch — not
before. Two things make that nearly invisible: signing in is itself a click, and
the player no longer unmounts, so a new member's sign-in starts the music on
`/welcome` and it plays straight through into Home. And because Chrome raises
Media Engagement for origins where audio actually plays for more than a few
seconds, repeat visits to the production domain do begin to autoplay outright.

### Left open

- **The Kitchen Lead lands on `/hq` at sign-in.** With HQ silent, the owner —
  who lives in HQ — hears nothing unless they cross to the camp side. That is
  exactly why session 2 put music in HQ. The decision was made knowingly; if it
  feels wrong in use, emptying `SILENT_AREAS` reverses it in one line.
- **Not deployed.** The fix is committed to the working tree only; production
  still has the banner and the old bridge.
- **Still no test suite.** This bug lived in DOM/event wiring, which
  `lib/domain/*` tests would not have caught.

---

## 1. THE ONE THING TO DO NEXT

The camp owner said it plainly at the close of the session:

> *"Next session we will work on the total budget, set it, understand the
> budget per head, and then start closing the menu based on the given budget."*

So the sequence is:

1. **Enter the real budget.** HQ → תקציב → "תקציב כולל למטבח". It is the pot
   finance gave, not a rate per head. Everything derives from it.
2. **Read the per-head figure** the product computes, and sanity-check it
   against the number of registered people — that is where the head count comes
   from (`defaultDiners()`).
3. **Close the menu against it.** Cost the leading evenings, read the projection
   panel on the round page, decide which the camp can afford.

**Do not build a new budget screen.** It exists and was verified end to end in
session 2 — with a total, without one, under budget in green, over budget in
red. What is missing is the number, and only a human can supply it.

### Blocked on nothing else

The vote is live and correct. The shift board is live. The ingredient catalogue
and the equipment list exist. The only things between now and a real menu are
**recipes**, which is typing, and **the budget**, which is a conversation.

---

## 2. WHERE EVERYTHING STANDS

Live at **https://shmifting-kitchen.vercel.app** — see `project_summary.md`
§8B for the deployment, the database and the guard rails.

| | |
|---|---|
| people | **1** — תומר נבו `<tomerikoka@gmail.com>`, admin. Head count derives from this. |
| invite code | **`SHMIFT2026`** |
| departure | **2 Nov 2026** · Midburn runs 2–7 Nov at Tzin |
| the vote | **open**, 12 evenings, 6 flames each, max 1 per evening, closes **1 Oct 2026** |
| votes cast | 3 — Tomer, mid-experiment. He has unspent flames. |
| shifts | **5 dinners** 2–6 Nov, 16:30–20:00, 5 cooks each = 25 slots, self-assignment open |
| ingredients | **104**, all priced, 43 carrying allergens |
| equipment | **27 items**, ₪5,040 estimated, every one still needing a supplier |
| meals / dishes / recipes | **0 / 0 / 0** — the work that has not started |
| budget | **unset**. `budgetTotal` and `budgetPerPerson` both empty. |

### Two mismatches to resolve with the Lead

**Six flames, five dinners.** The vote hands out six flames because the camp
intends six evenings, but the shift board has five (the 7th is pack-up). Either
add a sixth dinner with its shifts, or drop the flame count to five. Leaving it
means the camp elects an evening with nowhere to cook it.

**`expectedDiners` derives from the roster** and currently reads 1. That is
correct and climbs as people register — but every recipe quantity and the
budget ceiling scale off it, so anything costed today is costed for one person.
An override exists in HQ → תקציב for people the Lead knows will not sign up.

---

## 3. WHAT SESSION 2 BUILT

Roughly in order. The reasoning is in the commit messages, which are unusually
detailed on purpose.

### Deployed it

Vercel + Turso, from nothing. The four `403 exhausted balance` failures were
never billing: `import "dotenv/config"` reads only `.env`, and the working key
lives in `.env.local`. See `scripts/load-env.ts` — that trap bit three separate
times in one day and is now impossible to hit from a script.

### Music and motion

Three mixkit.co tracks behind a header toggle, **on by default** — a deliberate
override of Design Book §51, recorded in `project_summary.md` §5. Do not revert
it because the Design Book says otherwise; ask a human. The Home and welcome
heroes carry a Seedance ambient loop. Both are finished.

### The voting model, three times

Worth reading before changing anything.

1. **First cut:** one round asking which cuisines to have.
2. **Second:** a round per cuisine with six mains inside. Wrong — it assumed the
   cuisines were already chosen, leaving the Lead to make the interesting
   decision alone.
3. **Shipped:** one round, twelve whole evenings with closed menus, six flames
   per member and **at most one per evening**. The tally IS the menu; nothing
   needs interpreting. Members can add their own evening, credited by name.

The camp sees live standings on `/menu` while voting runs, with a cut line after
the sixth evening. Aggregate only — never who voted for what.

### Money

- **Ingredient catalogue** — 104 items, Israeli 2026 estimates.
- **Equipment list** — 27 items, separate from shopping because a fridge is
  rented, does not scale with head count and comes back afterwards.
- **Total budget** as the primary ceiling, per-head derived. One resolver in
  `lib/domain/budget.ts`, so no two screens can disagree.
- **Costing an evening before it wins** — `dishes.mealId` is nullable and a dish
  can hang off a vote option instead. Promotion re-parents them onto the meal
  with recipes intact.
- **The projection panel** on the round page: what the leading evenings cost,
  measured against the pot *minus the kit*.

---

## 4. THE TRAPS, IN THE ORDER THEY WILL BITE

**`drizzle-kit push` cannot add a column and its index or constraint together.**
It emits the index first and fails on the missing column. Twice in session 2.
Both tables were empty so they were rebuilt by hand. **The next schema change
lands on tables with real rows** — write a migration, or `alter table … add
column` first and let push reconcile after.

**Scripts must `import "./load-env"` before `../lib/db`.** ES imports hoist, so
configuring dotenv in the script body is already too late: the connection was
opened against the wrong file. It fails silently and looks like missing data.

**`.env.local` holds the live Turso credentials**, so every local script points
at the real camp. `scripts/guard-remote.ts` refuses destructive ones unless the
URL is a `file:` URL; `--dry-run` is exempt. Do not defeat it.

**A dish belongs to exactly one of a meal or a vote option**, enforced by a
CHECK constraint. Anything walking `dishes` directly must say which kind it
wants. Everything operational walks the MENU, which is why proposals cannot leak
into the shopping list, the budget or the printed pack.

**Emails are stored lowercased.** A script matching an email exactly will update
zero rows and cheerfully report success. Check `rowsAffected`.

**Probe accounts.** Session 2 used `PREVIEW…` accounts and deleted each one. If
you create one, delete it — and never let a probe be the first account in an
empty camp, because the first account becomes Kitchen Lead.

---

## 5. WHAT IS STILL UNBUILT

**Recipes.** Nothing exists. Around thirty dishes across six evenings, each
needing ingredients and quantities. Everything downstream — shopping, volumes,
budget — is computed and appears the moment recipes do. This is the bottleneck,
and it is typing rather than engineering.

**The empty-state QA pass.** Still never done and still time-sensitive: the
database is nearly empty and will not be again. Never inspected: `/hq/settings`,
`/hq/menu/[id]`, most HQ screens at 390px, keyboard navigation, and the printed
pack as actual paginated output.

**No test suite.** `lib/domain/*` is pure and deterministic and is where the
session's real bugs lived. That is where tests would pay first.

**Two ungenerated clips**, `hero-locked` and `flame-lit`. `flame-lit` needs
thought: it is a square token and `AmbientPoster` is an async Server Component,
so it cannot drop into the `"use client"` voting board as-is.

---

## 6. VERIFYING IT STILL WORKS

There is no seeded demo camp any more — production is the real one.

```bash
npm run typecheck && npm run build      # both pass at the end of session 2
```

Then against the live site:

1. `/welcome` → register a `PREVIEW…` account with code `SHMIFT2026`.
2. It should land on **`/` (Home)**, not the profile form, showing the 0/3 trail.
3. `/vote` → six flames, one per evening; a second flame on the same evening
   does nothing. Save, reload, change it, save again — the old choice must be
   gone, not added to.
4. `/menu` → live standings with a cut line after the sixth evening.
5. `/shifts` → five evenings, "אני בפנים" claims one.
6. **Delete the probe** — `users`, plus its `votes`, `food_profiles` and
   `shift_assignments`.

For HQ you need an admin: promote the probe with `lower(email)=lower(?)` and
check `rowsAffected`.
