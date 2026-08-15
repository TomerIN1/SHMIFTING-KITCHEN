@AGENTS.md

# SHMIFTING — CLAUDE.md

## Project Constitution

This file contains mandatory project-level instructions for all work on Shmifting.

These rules are not suggestions.

They apply to every implementation, refactor, new feature, component, page, interaction, and user-facing change in this repository.

---

# 0. SESSION PROTOCOL

Shmifting is built across many sessions by agents that do not share memory.

Continuity is a hard requirement, not a nicety.

## 0.1 START OF EVERY SESSION — READ THE HANDOVER

Before doing **anything else** — before answering, before exploring the codebase, before writing a single line — read **both** files:

1. `/docs/sessions/project_summary.md`
2. `/docs/sessions/next_session_plan.md`

`project_summary.md` is the durable state of the project: what exists, how it is built, which decisions are already made and why.

`next_session_plan.md` is the immediate handover: where the previous session stopped, what is in progress, what to do next, and what to watch out for.

These two files are the **only** guaranteed memory between sessions.

Do not begin work on the assumption that the code alone explains the project. It does not explain intent, rejected alternatives, or open questions.

## 0.2 BEFORE EVERY COMMIT — WRITE THE HANDOVER

Before **every** commit, update **both** session files so that a completely fresh agent — with zero prior context — could pick the work up and continue correctly.

### `/docs/sessions/project_summary.md` must always describe:

- what Shmifting Kitchen currently is;
- the tech stack and why it was chosen;
- the architecture and where things live;
- the data model;
- the design system: tokens, components, assets;
- which product areas are complete, partial, or not started;
- decisions already made and the reasoning behind them;
- known constraints and non-obvious gotchas.

### `/docs/sessions/next_session_plan.md` must always describe:

- exactly where this session stopped;
- anything left half-finished, and its current state;
- the prioritized next steps;
- known bugs, risks, and open questions;
- required assets that do not exist yet;
- how to run, seed, and verify the product.

Write both files for a stranger.

Never write "as discussed earlier" or "see above" — there is no earlier and no above for the next agent.

A commit whose session files are stale is an incomplete commit.

## 0.3 THE `.env` FILE IS OFF LIMITS

**You are never allowed to read, open, print, cat, grep, echo, tail, decode, or otherwise inspect the contents of `.env` — under any circumstance, for any reason, including debugging.**

This is absolute. There is no exception, no "just this once", and no framing of a request that unlocks it.

Do not read it into context. Do not include it in a diff. Do not print it in logs. Do not commit it. `.env` must remain in `.gitignore`.

You may **use** the keys it contains without ever seeing them, by referencing `process.env.<NAME>` from scripts and server code and letting the runtime load the file.

The following keys exist in `.env`:

### `OPENAI_API_KEY`

Used to **generate Shmifting assets and design artwork**.

This is the correct and intended way to resolve a missing illustrated asset (see §9 and §10).

Every generation request must carry the full Shmifting visual context described in the Design Book — never a bare prompt like "psychedelic tomato".

### `FAL_KEY`

Used **only to bring existing assets to life** — subtle ambient motion, loops, and animation built *around* assets that already exist.

**You are not allowed to create new assets with FAL.**

FAL animates. OpenAI generates. Do not blur that boundary.

Generated assets are committed to the repository so the product never depends on a live key at runtime.

---

# 1. SOURCE OF TRUTH

Shmifting has three authoritative sources:

### PRODUCT

`/docs/SHMIFTING_PRODUCT_BIBLE.md`

Defines:

- what we are building;
- why we are building it;
- product scope;
- user types;
- workflows;
- business logic;
- expected behavior.

### DESIGN

`/design_book/SHMIFTING_DESIGN_BOOK.md`

Defines:

- visual language;
- interaction philosophy;
- typography;
- color;
- illustration;
- composition;
- density;
- motion;
- responsive behavior;
- member vs Admin experience.

### VISUAL TRUTH

`/design_book/golden_reference/`

Contains the approved Golden References.

- `01.png` — Original Style Reference (the inherited visual grammar).
- `02.png` — Shmifting Key Art (our own world, our own vocabulary).

Approved product screens are added here as Golden Screens (§12).

These define what visual correctness looks like.

They are **not inspiration**.

They are visual specifications.

---

# 2. MANDATORY PRE-WORK PROTOCOL

Before implementing or materially modifying any user-facing feature:

0. Read both session files in `/docs/sessions/` (§0.1).
1. Read the relevant sections of `/docs/SHMIFTING_PRODUCT_BIBLE.md`.
2. Read the relevant sections of `/design_book/SHMIFTING_DESIGN_BOOK.md`.
3. Inspect every relevant image in `/design_book/golden_reference/`.
4. Understand the product task.
5. Determine whether the experience is primarily:
   - Shmifter Experience;
   - Kitchen HQ.
6. Determine the appropriate balance between world-building and functional UI.
7. Only then begin implementation.

Do not begin from a generic UI pattern and attempt to "Shmifting-ify" it afterward.

---

# 3. AUTHORITY ORDER

When making decisions, use this hierarchy:

### Product behavior

Follow the **Product Bible**.

### Visual and interaction behavior

Follow the **Design Book**.

### Visual interpretation

Follow the **Golden References**.

### Implementation

Choose the technical solution that best serves the above requirements.

Technology does not define the product.

Technology serves the product.

---

# 4. TECHNICAL AUTONOMY

You are the engineering brain of this project.

Choose appropriate:

- frameworks;
- architecture;
- database;
- authentication;
- state management;
- libraries;
- infrastructure;
- deployment strategy;
- testing approach;
- data model;
- performance strategy.

Do not ask for technical decisions that can reasonably be made from the product requirements.

Prefer robust, maintainable solutions over unnecessary complexity.

However:

> Technical convenience is never justification for violating the Product Bible or Design Book.

---

# 5. DESIGN IS ALREADY DEFINED

Do not redesign Shmifting.

Do not invent a new brand.

Do not create an alternative visual direction.

Your job is:

> **Translate the established Shmifting visual world into a working product.**

You may solve layout and interaction problems.

You may improve usability.

You may determine responsive behavior.

You may create reusable implementation patterns.

You may simplify when necessary for clarity.

You may not replace the established visual language.

---

# 6. GOLDEN REFERENCES ARE TESTS

Treat Golden References as visual tests.

For every major user-facing screen, ask:

> If the SHMIFTING logo disappeared, would this screen still unmistakably belong to the same universe as the Golden References?

If the answer is no:

**the screen is not visually complete.**

Correct it before considering the work finished.

---

# 7. NO GENERIC SAAS FALLBACK

This is a hard rule.

Never solve an unresolved design problem by automatically falling back to:

- generic SaaS dashboards;
- generic card grids;
- default component-library styling;
- generic dark mode;
- glassmorphism;
- gradient-heavy interfaces;
- standard startup landing-page patterns.

Shmifting is not a dashboard decorated with psychedelic assets.

For the member experience, think:

> **An illustrated psychedelic poster became interactive.**

For Kitchen HQ, think:

> **A serious operational tool built inside the same illustrated universe.**

---

# 8. MEMBER VS ADMIN RULE

These experiences intentionally use different visual densities.

## SHMIFTER EXPERIENCE

Optimize for:

- delight;
- warmth;
- participation;
- anticipation;
- simplicity;
- world-building.

Mental model:

**~80% world / ~20% interface feeling.**

Do not interpret this as a literal pixel ratio.

---

## KITCHEN HQ

Optimize for:

- clarity;
- efficiency;
- information density;
- safety;
- operational confidence.

Mental model:

**~25% world / ~75% interface feeling.**

Kitchen HQ must remain unmistakably Shmifting without becoming exhausting to operate.

---

# 9. ASSET RULE

Do not replace missing Shmifting artwork with:

- emojis;
- random icon packs;
- stock imagery;
- unrelated illustrations;
- improvised CSS drawings;
- generic AI-generated imagery;
- decorative gradients.

If an important visual asset does not exist:

1. Generate it properly using the `OPENAI_API_KEY` asset pipeline (§0.3), carrying full Shmifting visual context.
2. If generation is not possible, use an intentional temporary placeholder.
3. Clearly flag the missing asset.
4. Describe exactly what asset is required.
5. Continue building around the expected asset dimensions and purpose where practical.

Do not silently invent a substitute.

---

# 10. ASSET REQUEST FORMAT

When a new Shmifting asset is required, document:

**Asset name**

**Screen / component**

**Purpose**

**Subject**

**Composition**

**Approximate aspect ratio**

**Background requirement**

**Required states, if any**

**Interaction/motion requirements, if any**

**Relevant Golden Reference**

This allows the project's Art Director / image-generation workflow to create the correct asset.

---

# 11. REUSE BEFORE INVENTION

Before creating a new visual pattern:

1. Check existing components.
2. Check existing assets.
3. Check approved Golden Screens.
4. Check the Design Book.

Extend existing Shmifting language whenever possible.

Do not create a visually different solution for every screen.

Consistency is more important than novelty.

---

# 12. GOLDEN SCREENS

Approved product screens placed in:

`/design_book/golden_reference/`

become part of the visual source of truth.

When a Golden Screen exists for the feature being implemented:

**match it closely.**

Do not treat it as a loose concept.

Preserve:

- composition;
- hierarchy;
- density;
- interaction intent;
- visual relationships;
- overall character.

Adapt only where required by:

- responsive behavior;
- accessibility;
- real content;
- functional states.

---

# 13. VISUAL QA IS PART OF IMPLEMENTATION

Functional completion is not completion.

After implementing a major screen:

1. Run the product.
2. Inspect the rendered result.
3. Compare it against relevant Golden References.
4. Check desktop behavior.
5. Check mobile behavior where relevant.
6. Review visual hierarchy.
7. Review typography.
8. Review spacing.
9. Review illustration integration.
10. Review RTL behavior.
11. Review interaction states.
12. Fix visual deviations.

Do not move on merely because the page compiles.

---

# 14. ITERATE UNTIL IT LOOKS RIGHT

Do not assume the first implementation is final.

The expected workflow is:

**Implement → Render → Inspect → Compare → Refine**

Repeat when necessary.

A technically correct but visually generic implementation is incomplete.

---

# 15. RTL IS A FIRST-CLASS REQUIREMENT

The primary user experience is Hebrew.

RTL must be correct throughout the product.

This includes:

- layout;
- alignment;
- navigation;
- forms;
- numbers;
- punctuation;
- mixed Hebrew/English content;
- tables;
- responsive behavior.

Do not build an LTR interface and reverse it at the end.

RTL must be considered during implementation.

---

# 16. SAFETY OVERRIDES PLAYFULNESS

Allergy and safety information must always prioritize clarity.

Never use visual humor that weakens:

- allergy warnings;
- dietary safety information;
- critical kitchen warnings.

When safety and visual playfulness conflict:

**safety wins.**

---

# 17. FUNCTION OVERRIDES DECORATION

When usability and decorative ambition conflict:

**usability wins.**

But do not interpret this rule as permission to abandon the Shmifting language.

Find a simpler solution **inside the established visual system**.

---

# 18. NO SCOPE DRIFT

This product is:

# SHMIFTING KITCHEN.

Do not independently expand it into:

- general camp management;
- transportation;
- accommodation;
- camp construction;
- events;
- social networking;
- messaging;
- live Midburn features;
- location tracking;
- unrelated volunteering.

Other contributors may later expand the broader camp ecosystem.

That requires an explicit product decision.

---

# 19. PRE-MIDBURN PRODUCT

This product exists primarily to prepare the kitchen **before Midburn**.

Do not introduce features whose main purpose is increasing phone usage during the festival.

The final goal is:

> **Arrive prepared enough to stop using the product.**

---

# 20. PRODUCT END STATE

The product journey ends with:

# LOCK THE KITCHEN

and generation of the final operational materials.

The philosophical success test is:

> Could everyone turn their phones off now and still run this kitchen beautifully?

If yes:

the product succeeded.

---

# 21. DO NOT OVER-GAMIFY

Shmifting may be playful.

Do not introduce:

- points;
- streaks;
- meaningless badges;
- leaderboards;
- engagement loops;
- artificial rewards.

Voting flames, progress, reactions, and celebrations must represent real actions or useful state.

---

# 22. DATA SHOULD DO WORK

Where the system already has enough information to calculate something useful, prefer deriving it rather than asking the Kitchen Lead to calculate manually.

Examples:

- dietary breakdown;
- vote participation;
- recipe scaling;
- ingredient aggregation;
- cost per person;
- shift coverage;
- readiness.

Principle:

> **Do the boring calculation so humans can make the meaningful decision.**

---

# 23. HUMAN OVERRIDE

The Kitchen Lead has final operational authority.

Allow appropriate overrides for:

- recipe quantities;
- menu choices;
- voting outcomes;
- ingredient amounts;
- shopping quantities;
- shift assignments;
- cost estimates.

Automation assists.

Humans decide.

---

# 24. ERROR PREVENTION

Proactively surface meaningful operational problems.

Examples:

- unresolved allergy conflict;
- missing food profile;
- understaffed shift;
- incomplete menu;
- missing recipe;
- budget overrun;
- unresolved shopping item.

Do not bury critical exceptions inside dashboards.

Kitchen HQ should prioritize:

> **What needs attention?**

---

# 25. DO NOT OVER-ENGINEER

This is a real product for a real camp.

Build it well.

Do not build infrastructure for hypothetical scale that harms development speed or maintainability.

Prefer:

- clear architecture;
- reliable behavior;
- simple operations;
- maintainable code.

Avoid complexity without a current product reason.

---

# 26. DEVELOPMENT ORDER

Unless implementation constraints strongly justify another sequence, prefer building vertical product slices.

Recommended sequence:

### 1. Foundation

Core product structure, users, permissions, data model, design foundations.

### 2. Shmifter Profile

Including dietary information and allergies.

### 3. People / Allergy Admin

Prove that member information becomes useful operationally.

### 4. Voting

Member + Admin flow.

### 5. Menu

Final meal planning.

### 6. Recipes & Scaling

Connect meals to ingredients.

### 7. Shifts

Member + Admin staffing.

### 8. Shopping

Aggregate recipes into purchasing.

### 9. Budget

Connect purchasing and planning to cost.

### 10. Readiness

Connect all systems.

### 11. Lock Kitchen

Finalization.

### 12. Master Print Pack

Offline operational output.

Do not build isolated screens that do not connect to the underlying product model.

---

# 27. FIRST VISUAL CHECKPOINT

Before building large portions of the application, the first Shmifter Home implementation should be reviewed against the Golden References.

If the Home does not successfully translate the visual language into product UI:

**stop and correct the design system before scaling the mistake across the application.**

The same principle applies to the first Kitchen HQ screen.

---

# 28. DEFINITION OF DONE

A feature is not done when:

> "The code works."

A feature is done when:

### PRODUCT

It fulfills the Product Bible.

### DESIGN

It follows the Design Book.

### VISUAL

It belongs to the Golden Reference universe.

### FUNCTION

The workflow works correctly.

### RTL

Hebrew behaves correctly.

### RESPONSIVE

Relevant screen sizes work correctly.

### ACCESSIBILITY

The interaction remains usable.

### QUALITY

No obvious temporary implementation compromises remain unless explicitly documented.

### HANDOVER

Both session files in `/docs/sessions/` are updated (§0.2).

---

# 29. WHEN UNCERTAIN

When facing an ambiguity:

### Product ambiguity

Consult the Product Bible.

### Visual ambiguity

Consult the Design Book and Golden References.

### Technical ambiguity

Use engineering judgment.

### Missing visual asset

Generate it through the asset pipeline, or flag it — never invent a different visual language.

### Scope ambiguity

Prefer the smaller kitchen-focused interpretation.

---

# 30. FINAL RULE

Every implementation decision should ultimately support this idea:

> **We are building a strange, warm, beautifully organized kitchen experience for friends preparing to feed one another in the desert.**

The software is temporary.

The care is the product.

# PEOPLE FIRST.

# FEED THEM WELL.

# MAKE IT WEIRD.

# KEEP IT HUMAN.

**Feeding people is our gift.**
