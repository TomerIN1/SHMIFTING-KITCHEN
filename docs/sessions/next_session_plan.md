# NEXT SESSION PLAN

**Immediate handover. Read this second, after `project_summary.md` (CLAUDE.md §0.1).**

Written: 2026-08-15, end of the foundation session.

---

## 1. WHERE THIS SESSION STOPPED

The whole product was built end to end in one session, from an empty repository.

Every route in Bible §48 and §49 exists and works against real seeded data:

- Shmifter: Home, profile, voting, shifts, menu reveal.
- Kitchen HQ: overview, people, allergies, votes, menu, recipes, shifts, shopping, budget, readiness, LOCK THE KITCHEN, settings, Master Print Pack.

`npm run build` passes. `npm run typecheck` passes. 21 routes. No console errors on any page visited.

**Nothing is left half-written.** There is no partially-implemented file, no stubbed function, no TODO comment standing in for logic.

A follow-up visual QA pass fixed two things found by looking at rendered screens rather than code:

- the allergen chip on the recipe detail page printed the raw key (`legumes`) instead of the Hebrew label — it was missing `allergenLabel()`
- operational numerals were set in Suez One, whose zero and ₪ glyph read as Hebrew letters; `₪0` looked like a word. All HQ numerals now use the functional face (see the typography note in `project_summary.md`)
- **Kitchen HQ had no way out.** The header reused the member `UserBadge`, which renders a "מטבח HQ" link — inside HQ that pointed at the page you were already on, so the only route back to the camp side was editing the URL. `UserBadge` is now context-aware. Sign-out also picked up its own `exit` glyph, because it had been sharing the `arrow` shape with the new back link.

---

## 2. THE ONE BLOCKED THING

### FAL animation — account has no balance

`npm run assets:animate` fails with:

```
403 {"detail":"User is locked. Reason: Exhausted balance.
Top up your balance at fal.ai/dashboard/billing."}
```

This is an account state, not a bug. Everything around it is finished and waiting:

- `scripts/animate-assets.mjs` is written, documented, and defines three clips: `hero-home`, `hero-locked`, `flame-lit`. Prompts are constrained to ambient motion only — no camera moves, no new objects (Design Book §48).
- `lib/motion.ts` detects `public/motion/<name>.mp4` at request time.
- `components/shmifting/AmbientPoster.tsx` renders the clip over the still poster, muted, looping, and hidden entirely under `prefers-reduced-motion` (Design Book §50).
- The Shmifter Home already uses `AmbientPoster`.

**To finish it:** top up at fal.ai, then `npm run assets:animate`. The Home comes alive with no code change. If you want more clips, add entries to `CLIPS` in the script and swap the relevant `<Image>` for `<AmbientPoster>` — note `AmbientPoster` is an async Server Component, so it cannot be dropped into a `"use client"` file (the lock screens in `app/hq/readiness/LockKitchen.tsx` are client components and still use plain `<Image>`).

---

## 3. WHAT TO DO NEXT — PRIORITISED

### P0 — Real camp data
The seed is fiction. Before anyone uses this:
1. `/hq/settings` — set the real departure date, festival window, invite code, shift quota. Everything else keys off these (Bible §38).
2. `/hq/budget` — set the real budget per person and the real head count. **The head count is what multiplies every recipe.**
3. Delete the seeded people, or run against a fresh database (`npm run db:reset` then remove the seed users).

### P1 — Deploy
Nothing is deployment-specific except the database. Set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (or point at any libSQL server) and `AUTH_SECRET`, then deploy. `lib/db/index.ts` needs no change. Vercel is the obvious target given the stack.

Generate a fresh `AUTH_SECRET` for production — do not reuse the development one in `.env.local`.

### P2 — Worth building next, in order of real value
- **Reminders** (Bible §37). The data to drive them already exists: `getBreakdown().profilesMissing`, `RoundResult.nonVoters`, `getShiftStats().peopleWithoutShift`. Keep it to preparation, never engagement. Email or WhatsApp export of the list would be enough.
- **Profile photos.** `users.avatarUrl` exists and is unused; the UI falls back to an initial in a circle.
- **Ingredient catalogue screen.** `updateIngredient` in `app/hq/recipes/actions.ts` is written and has no UI. Right now an ingredient's category, cost and allergens can only be set when it is first created. This is the largest genuine gap.
- **Dedicated Golden Screens.** Design Book §65 asks that approved Shmifter Home, Menu Voting and Kitchen HQ screenshots be added to `design_book/golden_reference/` as 03/04/05. Screenshots exist in `.playwright-mcp/` from this session but were not promoted — that needs a human's approval, not an agent's.

---

## 4. KNOWN RISKS AND OPEN QUESTIONS

- **Dates in the seed are relative** (departure = today + 83 days, to match the Bible's own example). Real Midburn dates were never supplied and are the Kitchen Lead's to enter.
- **No test suite.** `lib/domain/*` is pure and the obvious place to start — `practicalRound`, `scaleRecipe`, `aggregateIngredients`, `analyseMeal`, `computeReadiness` are all deterministic and were the source of the two real bugs found this session.
- **Concurrency on shift capacity** is checked-then-inserted rather than transactional. For a camp of tens of people this is fine; two people racing for the last slot in the same millisecond could both get in.
- **No rate limiting on sign-in.** Acceptable for a private camp behind an invite code; not acceptable if this is ever made public.
- **`practicalRound` always rounds up.** Deliberate — running out of onions in the desert is a real failure, one spare onion is not. If the Lead disagrees they override the line, which is exactly the affordance Bible §23 asks for.

---

## 5. ASSETS

21 exist in `public/assets/` (WebP), listed in `components/shmifting/assets.ts`. Nothing needed is missing.

**If you need a new one:** add it to `ASSETS` in `scripts/generate-assets.mjs`, run `npm run assets:generate && npm run assets:optimize`, then export it from `assets.ts`. The style contract at the top of that script is what keeps new artwork inside the same universe (Design Book §55) — do not write a bare prompt, and do not substitute an emoji or an icon pack (CLAUDE.md §9).

Assets that could improve the product but are not blocking:
- Per-meal-concept artwork for the menu reveal (Design Book §40: "Each major dinner concept may receive dedicated artwork"). `meals.imageUrl` and `voteOptions.imageUrl` columns already exist and are unused.
- A "hands making room" illustration for joining a shift (Design Book §49).

---

## 6. VERIFYING IT STILL WORKS

```bash
npm run db:reset && npm run dev
```

Then walk this path — it exercises every system:

1. `/welcome` → sign in as `tomer@shmifting.camp` / `shmifting`.
2. `/hq` → the exception list should show ~7 items. **If it shows 27 "no food" cases, the empty-meal guard in `lib/domain/coverage.ts` has regressed.**
3. `/hq/allergies` → רועי's dairy allergy must list the two dishes it conflicts with. That is live conflict detection, not stored data.
4. `/hq/recipes/<any>` → change "כמות סופית לקמפ" on a line; the value turns lavender and is labelled ידני, with the calculated number still shown beside it.
5. `/hq/shopping` → בצל should aggregate to ~5.75 ק"ג across recipes. **If the projected total reads tens of thousands of shekels, `convertUnitCost` has regressed.**
6. `/hq/menu` → press THE MENU HAS SPOKEN, then visit `/menu` as a member.
7. `/hq/pack` → print preview. Charcoal and grain must vanish; ink and structure remain.

Sanity numbers for the seeded camp: 24 people, 4 without a profile, 4 allergies (2 unreviewed), 7 meals (4 final), 40/43 shift positions filled, 35 shopping items, ~₪1,600 projected, readiness 53%.
