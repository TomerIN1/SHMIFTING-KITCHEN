# SHMIFTING KITCHEN
## Product Bible

**Status:** Product source of truth  
**Audience:** Claude Code and future contributors  
**Scope:** Product vision, behavior, information architecture, user journeys, business logic, and functional requirements  
**Technology:** Intentionally unspecified

---

# 1. Product Definition

Shmifting Kitchen is a pre-Midburn kitchen planning experience for the members of **Camp Shmifting**.

It has one clear mission:

> **Plan the camp kitchen so thoroughly before Midburn that once the festival begins, nobody needs technology to run it.**

The product combines two experiences:

1. A playful, warm, participatory experience for camp members.
2. A serious kitchen planning and management system for the kitchen lead.

The system exists **before Midburn**.

During Midburn, the kitchen should operate from plans, printed materials, preparation, human communication, and shared responsibility.

The product should ultimately make itself unnecessary.

---

# 2. The Philosophy

## Feeding people is our gift.

Shmifting is a camp built around meaningful gifting.

The idea behind the name is the distinction between:

**Gift** — something genuinely given to another person.

**Shmift** — something technically given as a gift, but with little meaning or value to the recipient.

**Shmifting** — turning a small act of giving into a meaningful human moment.

The kitchen is an expression of this philosophy.

Food is not simply infrastructure required to keep the camp functioning.

The kitchen should communicate:

> We thought about you before you arrived.

We asked what you eat.

We remembered your restrictions.

We took your allergies seriously.

We asked what would make you happy.

We let you participate in choosing the food.

We built the menu around the people who will actually eat it.

We planned enough food.

We organized the work.

And when you arrive in the desert, you do not need to think about any of it.

That is the gift.

---

# 3. Product North Star

Every important product decision should support at least one of these outcomes:

### Care

Every camp member should feel considered.

### Participation

The kitchen is created with the camp, not merely for the camp.

### Confidence

The kitchen lead should know exactly what needs to happen before leaving for Midburn.

### Simplicity

Complexity belongs behind the scenes. Camp members should experience something easy and enjoyable.

### Readiness

By departure day, there should be no unresolved operational questions.

### Disconnection

Technology helps us prepare for the desert.

It should not follow us into it.

---

# 4. What This Product Is Not

This is important.

Shmifting Kitchen is **not**:

- a general camp management platform;
- a social network;
- a Midburn companion app;
- a live festival dashboard;
- a notification platform for use during the festival;
- a tool intended to keep people looking at their phones at Midburn;
- a generic project management system;
- a restaurant management product;
- a generic meal planner.

Other members of Camp Shmifting may later decide to build technology for other parts of the camp.

That is outside the scope of this product.

This product owns one domain:

# THE KITCHEN.

---

# 5. Product Timeline

The experience has three broad phases.

## Phase A — Learn About the Camp

The system learns:

- Who is coming?
- What does everyone eat?
- What allergies exist?
- What restrictions exist?
- What do people dislike?
- What food would make them happy?

## Phase B — Build the Kitchen Together

The camp:

- votes on meal concepts;
- participates in menu decisions;
- chooses kitchen shifts.

The kitchen lead:

- builds the final menu;
- creates recipes;
- calculates quantities;
- reviews dietary coverage;
- manages allergies;
- calculates costs;
- creates the shopping plan;
- completes staffing.

## Phase C — Lock the Kitchen

Before departure:

- profiles are complete;
- allergies have been reviewed;
- the menu is final;
- recipes are final;
- quantities are final;
- shifts are staffed;
- shopping is complete;
- the budget is understood;
- operational documents are generated.

Then:

# LOCK THE KITCHEN.

The digital planning phase ends.

---

# 6. Primary User Types

There are two primary experiences.

## 6.1 Shmifter

A regular member of Camp Shmifting.

Their experience should be extremely simple.

They should primarily:

1. Complete their food profile.
2. Participate in meal voting.
3. Select kitchen shifts.
4. Discover the final menu.
5. Know when they have completed everything required of them.

A Shmifter should never feel like they are using management software.

---

## 6.2 Kitchen Lead / Admin

The person responsible for planning the kitchen.

The Kitchen Lead needs substantially more control.

They need to manage:

- people;
- dietary information;
- allergies;
- voting;
- meals;
- recipes;
- quantities;
- shifts;
- budget;
- shopping;
- readiness;
- final kitchen documentation.

The Admin experience can be denser and more operational than the Shmifter experience.

Functionality and clarity are more important than theatrical presentation here.

---

# 7. Core Product Model

The product should conceptually connect the following entities:

**People**

↓

**Dietary Needs & Preferences**

↓

**Meal Voting**

↓

**Final Menu**

↓

**Dishes**

↓

**Recipes**

↓

**Ingredient Quantities**

↓

**Shopping**

↓

**Budget**

In parallel:

**People**

↓

**Kitchen Shifts**

Everything eventually converges into:

# KITCHEN READINESS

---

# 8. Shmifter Journey

The main member journey is:

**WELCOME → PROFILE → VOTE → SHIFTS → FINAL MENU → READY**

The system should always make it obvious:

- what the person has completed;
- what remains;
- whether action is currently required.

The member should not need to understand the underlying kitchen management complexity.

---

# 9. Home

The Shmifter Home is the central pre-Midburn destination.

It should communicate three things immediately:

### Where are we?

For example:

**83 DAYS TO THE DUST**

### What have I completed?

For example:

- Food profile ✓
- Friday dinner vote ✓
- Kitchen shift ○

### What should I do next?

There should usually be one obvious primary action.

For example:

**CHOOSE YOUR SHIFT**

The Home should evolve as planning progresses.

Early in the process, profile completion may dominate.

Later, voting may dominate.

Later still, shifts and the final menu may dominate.

The interface should therefore reflect the **current planning stage**, rather than behave as a static dashboard.

---

# 10. Food Profile

The food profile is one of the most important parts of the entire product.

Its emotional message is:

> **We want you to eat well. Help us understand what that means for you.**

The profile should collect at minimum:

### Identity

- Name
- Profile photo if desired

### Dietary Pattern

Examples:

- Eats everything
- Vegetarian
- Vegan

The system should allow future extension if another meaningful dietary category becomes necessary.

### Allergies

Allergies must be treated differently from preferences.

A person should be able to:

- identify an allergen;
- provide additional details;
- describe severity or important handling information when relevant.

The product must never visually treat allergies as casual preferences.

### Restrictions / Sensitivities

Examples may include:

- gluten;
- lactose;
- other food restrictions.

### Dislikes

Camp members should be able to tell the kitchen what they simply dislike.

These are not safety constraints.

They are preference signals.

### Spice Preference

The kitchen should understand approximately how much heat people enjoy.

### Open Food Wish

Ask something human rather than clinical:

> **What food would make you happy in the middle of the desert?**

Free-text answers can later help the Kitchen Lead understand what the camp actually wants.

---

# 11. Allergy Center

Allergies require their own operational workflow.

The Kitchen Lead must have a dedicated Allergy Center that aggregates all reported allergies.

The system should make it easy to answer:

- Who has an allergy?
- What is the allergen?
- What details did the person provide?
- Which meals or dishes potentially conflict with it?
- Has the Kitchen Lead reviewed it?

Allergy information must be prominent when relevant.

It must never become buried inside individual profiles.

The product should distinguish clearly between:

**Allergy / safety concern**

and

**Preference / dislike**

These concepts must not be merged.

---

# 12. Meal Voting

Meal voting is one of the main participatory experiences.

It should feel like a camp activity rather than a survey.

Voting happens **before Midburn**.

The Kitchen Lead creates voting rounds for specific meals or meal slots.

Example:

**FRIDAY DINNER**

Possible concepts:

- Indian Night
- Mexican Night
- Italian Night

Each concept can include:

- title;
- description;
- representative dishes;
- visual representation;
- relevant dietary information.

---

# 13. Voting Mechanism

The preferred voting model is weighted voting using a small number of tokens represented conceptually as **flames**.

For example:

A member receives:

🔥 🔥 🔥

They may distribute them:

**3 / 0 / 0**

or:

**2 / 1 / 0**

or:

**1 / 1 / 1**

This provides more information than a binary selection.

It measures enthusiasm.

The Kitchen Lead should be able to configure voting rounds appropriately rather than having the mechanism unnecessarily hard-coded to one exact number of options forever.

Members should be able to edit their vote while the voting round remains open.

Once voting closes, results become final for that round.

The Kitchen Lead retains final responsibility for the actual menu.

Voting informs the kitchen.

It does not automatically dictate operational decisions when dietary, budgetary, logistical, or safety considerations require adjustment.

---

# 14. Voting Administration

The Kitchen Lead should be able to:

- create a voting round;
- associate it with a meal/date;
- create meal concepts;
- open voting;
- close voting;
- see participation;
- see weighted results;
- identify members who have not voted.

Useful results include:

- total votes;
- participation rate;
- weighted score per concept;
- percentage or relative preference;
- strongest and weakest options.

---

# 15. Final Menu

Voting eventually becomes an actual menu.

The Kitchen Lead creates the final schedule of meals for the festival.

A meal should conceptually include:

- date;
- meal type;
- title/concept;
- expected number of diners;
- dishes;
- dietary coverage;
- allergy considerations;
- estimated cost;
- associated kitchen shift.

The final menu is operational for the Kitchen Lead but celebratory for Shmifters.

---

# 16. Final Menu Reveal

Once enough menu decisions are final, camp members should receive a dedicated reveal experience.

The goal is anticipation.

It should feel closer to revealing a festival lineup than opening a spreadsheet.

Members should be able to browse the meals planned for each day.

The reveal should answer:

> **What are we going to eat together?**

It should not expose unnecessary kitchen management information.

---

# 17. Dietary Coverage

Every planned meal should make it easy for the Kitchen Lead to understand who can eat it.

The system should evaluate the relationship between:

- camp member dietary profiles;
- dishes;
- recipe ingredients;
- known allergy information.

The Kitchen Lead should be able to see warnings such as:

**46 diners**

**Vegan coverage:** ✓  
**Vegetarian coverage:** ✓  
**Allergy conflict:** ⚠️ 1

The goal is not necessarily for every individual dish to serve every person.

The goal is to ensure that every camp member has an appropriate, intentional meal available.

---

# 18. Recipes

Each dish may have a recipe.

A recipe should contain:

- recipe name;
- base serving count;
- ingredients;
- base quantities;
- preparation instructions;
- notes;
- dietary classification;
- relevant allergen information.

Recipes are operational kitchen objects, not merely content pages.

They drive quantities, shopping, costs, and preparation.

---

# 19. Recipe Scaling

Recipes must support scaling.

Example:

Base recipe:

**6 servings**

Required:

**46 servings**

The system should calculate scaled ingredient quantities.

However, real kitchens do not operate on mathematically perfect values.

The Kitchen Lead must therefore be able to manually override calculated quantities.

The system should support practical rounding where appropriate.

Example:

**15.33 onions**

is less useful than:

**16 onions**

The product should assist the Kitchen Lead rather than pretend mathematical scaling always represents the correct cooking decision.

---

# 20. Ingredient Model

Ingredients should be reusable entities whenever practical.

For example:

**Tomatoes**

may appear in:

- breakfast;
- salad;
- pasta sauce;
- curry.

The system should be able to aggregate quantities across recipes.

Ingredient information may include:

- name;
- quantity;
- unit;
- shopping category;
- estimated unit cost;
- allergen information where relevant;
- notes.

Unit handling should be designed thoughtfully because kitchen quantities may use:

- units;
- grams;
- kilograms;
- milliliters;
- liters;
- packages;
- bottles;
- cans;
- other practical purchasing units.

---

# 21. Kitchen Shifts

Kitchen work is shared by camp members.

Shifts are planned before Midburn.

Typical shifts may include:

- breakfast;
- lunch;
- dinner.

A shift should contain:

- date;
- associated meal or time period;
- start time;
- end time;
- required number of people;
- assigned members.

Members should see:

- available shifts;
- capacity;
- whether a shift needs people;
- whether a shift is full;
- their own selected shift(s).

The Kitchen Lead should see the complete staffing picture.

---

# 22. Shift Rules

The system should support:

- member self-selection;
- capacity limits;
- clear indication of understaffed shifts;
- Kitchen Lead manual assignment;
- Kitchen Lead reassignment;
- Kitchen Lead removal;
- viewing the team assigned to each shift.

The product should make understaffing impossible to overlook.

The system should also make it easy to identify members who have not yet selected the required amount of kitchen participation.

---

# 23. Shift Administration

The Kitchen Lead needs a compact overview across the festival.

Conceptually:

| Meal | Thursday | Friday | Saturday |
|---|---|---|---|
| Breakfast | 4/4 | 2/4 ⚠ | 4/4 |
| Lunch | 3/3 | 3/3 | 3/3 |
| Dinner | 5/5 | 5/5 | 4/5 ⚠ |

The exact interface is a design decision.

The product requirement is immediate visibility into staffing gaps.

---

# 24. Budget

The Kitchen Lead needs a kitchen budget.

The system should support:

- number of camp members;
- budget per person;
- total kitchen budget;
- projected costs;
- actual costs;
- remaining budget;
- cost per person.

The Kitchen Lead should be able to understand how menu decisions affect cost.

Budget information may also be grouped by useful categories such as:

- produce;
- dry goods;
- drinks;
- breakfast;
- snacks;
- miscellaneous.

The exact categories should remain manageable rather than rigid.

---

# 25. Estimated vs Actual Cost

The product should distinguish between:

**Projected cost**

and

**Actual cost**

This allows planning before purchases and reconciliation as shopping happens.

The system should make it easy to understand:

> Are we within budget?

without requiring the Kitchen Lead to perform external calculations.

---

# 26. Master Shopping List

Recipes feed into one consolidated shopping system.

This is a core feature.

If three recipes require tomatoes, the Kitchen Lead should not manually combine them.

The system should aggregate them.

Example:

Recipe A → 3 kg tomatoes  
Recipe B → 4 kg tomatoes  
Recipe C → 2 kg tomatoes

Master Shopping List:

**Tomatoes — 9 kg**

The Kitchen Lead should retain the ability to adjust the final shopping quantity.

---

# 27. Shopping Categories

The shopping list should be organized into practical categories.

Examples:

- Produce
- Dry goods
- Refrigerated
- Drinks
- Spices
- Bakery
- Cleaning / kitchen supplies
- Other

Categories should support the actual shopping workflow rather than exist only for visual organization.

---

# 28. Shopping Status

Shopping items should support a simple operational lifecycle.

Conceptually:

**Needed → Assigned → Bought**

An item should be able to contain:

- ingredient/item;
- final quantity;
- category;
- estimated cost;
- actual cost;
- responsible person;
- status;
- notes.

The Kitchen Lead should be able to understand:

- what remains;
- who is responsible;
- what has already been purchased;
- how much has actually been spent.

---

# 29. Non-Recipe Shopping

Not everything required by a kitchen belongs to a recipe.

The Kitchen Lead must be able to manually add items such as:

- paper towels;
- garbage bags;
- cleaning supplies;
- cooking oil reserve;
- foil;
- storage containers;
- kitchen tools;
- other operational supplies.

The shopping system therefore cannot depend exclusively on recipe-generated ingredients.

---

# 30. Kitchen HQ

The Kitchen HQ is the Kitchen Lead's command center.

It should answer, at a glance:

### People

How many people are coming?

How many profiles are incomplete?

What is the dietary breakdown?

Are there unresolved allergy concerns?

### Voting

Which votes are open?

How many people participated?

Who has not voted?

### Menu

How many meals are finalized?

Are there dietary gaps?

Are there allergy conflicts?

### Shifts

Are all shifts staffed?

Where are people missing?

### Shopping

How much remains to purchase?

Who is responsible?

### Budget

Are we within budget?

### Readiness

How close are we to being completely ready?

The Kitchen HQ should prioritize **exceptions and unfinished work**, not simply display data.

---

# 31. Readiness Engine

The product should calculate or represent kitchen readiness.

This is not a meaningless gamification percentage.

It represents actual operational completeness.

Readiness should consider areas such as:

### People

- required profiles completed;
- allergy information reviewed.

### Menu

- required meals finalized;
- dietary coverage reviewed;
- allergy conflicts resolved.

### Recipes

- recipes finalized;
- quantities finalized.

### Shifts

- required positions filled.

### Shopping

- required items finalized;
- purchasing sufficiently complete.

### Budget

- budget reviewed;
- no unresolved major cost issue.

The Kitchen Lead should immediately understand what prevents the kitchen from being ready.

---

# 32. LOCK THE KITCHEN

This is the final milestone.

It should be a deliberate action.

The system should not encourage locking while critical preparation remains unresolved.

Before locking, the Kitchen Lead should receive a clear readiness summary.

The emotional meaning is:

> Planning is finished.

After confirmation:

# THE KITCHEN IS LOCKED.

The exact technical behavior of locking can be designed appropriately, but conceptually it should preserve the final operational plan and clearly communicate that the planning phase has ended.

The Kitchen Lead may still need an emergency ability to unlock or amend something, but this should be deliberate rather than casual.

---

# 33. Kitchen Master Pack

Once the kitchen is ready, the system should generate a printable operational package.

This is one of the most important outputs of the entire product.

The exact document structure may evolve, but it should include the information required to operate the kitchen without relying on phones.

At minimum:

## Final Menu

All meals organized chronologically.

## Shift Schedule

Who works when.

## Recipes

Final recipes using final camp quantities.

## Ingredient / Quantity Information

Operational quantities required for preparation.

## Allergy & Dietary Safety Information

Only information necessary for safe kitchen operation, presented clearly and respectfully.

## Shopping / Packing Information

What was purchased and what must reach the camp.

## Kitchen Checklist

Important operational preparation items.

The pack must be suitable for printing before departure.

---

# 34. Privacy

Food profiles contain personal information.

Allergy and dietary information should be handled respectfully.

Camp members should not automatically receive access to everyone else's detailed dietary or allergy data.

The Kitchen Lead needs access because the information is operationally necessary.

The product should follow a principle of:

> **Show personal information only where it is genuinely useful for the kitchen or explicitly intended to be social.**

---

# 35. Member Progress

Every Shmifter should have a simple sense of completion.

Examples:

- Profile completed
- Required votes completed
- Shift selected

The Home should tell the person what remains.

Avoid unnecessary achievement systems, points, badges, streaks, leaderboards, or engagement mechanics.

Participation itself is the goal.

---

# 36. Admin Progress

The Kitchen Lead needs a different kind of progress.

Not:

> You earned 500 kitchen points.

Instead:

> 4 profiles missing.

> Friday breakfast needs 2 people.

> 1 allergy conflict requires review.

> 7 shopping items remain.

Progress must correspond to actual work.

---

# 37. Notifications and Reminders

Before Midburn, reminders may be useful for incomplete actions such as:

- missing food profile;
- open vote;
- missing shift selection;
- unresolved admin task.

However, reminders should support preparation rather than become an engagement product.

The implementation method is intentionally not prescribed here.

During Midburn, the product should not be designed around digital notifications.

---

# 38. States and Deadlines

Major participatory activities need meaningful states.

For example, voting may be:

- upcoming;
- open;
- closed.

Shift selection may be:

- not open;
- open;
- completed;
- locked.

Menu items may be:

- proposed;
- being reviewed;
- final.

Shopping items may be:

- needed;
- assigned;
- bought.

The system should communicate these states clearly.

Deadlines should be configurable where appropriate rather than scattered through the product as fixed assumptions.

---

# 39. Empty States

The product must handle incomplete preparation gracefully.

Examples:

No voting rounds exist yet.

No menu has been published.

Shift selection has not opened.

The final menu is not ready.

The shopping list has not been generated.

These states should explain what is happening rather than look broken.

---

# 40. Error Prevention

Kitchen planning contains decisions with real consequences.

The product should favor prevention over recovery.

Examples:

Warn before closing an incomplete voting round.

Warn when an allergy conflicts with a planned dish.

Warn when a shift is understaffed.

Warn when a required profile is missing.

Warn when budget projections exceed the available budget.

Warn before locking an incomplete kitchen.

Warnings should be meaningful.

Avoid warning fatigue.

---

# 41. Human Override

Automation should help the Kitchen Lead, not control the kitchen.

The Kitchen Lead must retain the ability to override:

- calculated quantities;
- menu decisions;
- voting outcomes;
- shift assignments;
- shopping quantities;
- estimated costs;
- ingredient assumptions.

The system should provide intelligence and structure while respecting human cooking judgment.

---

# 42. Product Intelligence

Where useful, the product should derive information rather than force the Kitchen Lead to calculate it manually.

Examples:

- dietary breakdown;
- voting participation;
- voting results;
- recipe scaling;
- consolidated ingredient quantities;
- projected meal cost;
- cost per person;
- shift coverage;
- profile completion;
- readiness.

The guiding principle is:

> **Do the boring calculation so the humans can make the meaningful decision.**

---

# 43. The Member Experience vs The Admin Experience

These should feel related but should not be identical.

## Shmifter Experience

Optimize for:

- delight;
- warmth;
- personality;
- simplicity;
- anticipation;
- participation.

## Kitchen HQ

Optimize for:

- clarity;
- speed;
- confidence;
- information density;
- exception management;
- operational control.

Do not sacrifice serious kitchen usability merely to make the Admin interface playful.

Do not make the Shmifter interface feel like an Admin interface with features removed.

They are two experiences sharing one product model.

---

# 44. Mobile and Desktop Context

Shmifters are likely to interact casually and should have an excellent small-screen experience.

Kitchen planning may involve more complex work and should support larger-screen workflows exceptionally well.

Do not assume that both experiences need identical interaction patterns.

The product should adapt to the job being performed.

---

# 45. Language

The primary audience is Camp Shmifting.

The main product experience should support Hebrew naturally and correctly, including proper right-to-left behavior.

The brand may intentionally use selected English phrases such as:

**SHMIFTING**

**GIFT OR SHMIFT?**

**THE MENU HAS SPOKEN**

**LOCK THE KITCHEN**

where they contribute to the camp's voice.

Do not allow mixed-language usage to damage readability.

---

# 46. Product Tone

The product is:

- warm;
- weird;
- playful;
- adult;
- generous;
- communal;
- slightly irreverent;
- deeply caring underneath the humor.

It is not:

- corporate;
- childish;
- clinical;
- spiritual in a forced way;
- productivity obsessed;
- tech obsessed.

The kitchen can joke.

It cannot joke about safety.

---

# 47. Success Criteria

The product succeeds if, before Midburn:

### Every person feels considered.

The kitchen understands who it is feeding.

### Dietary and allergy information is actionable.

It does not merely exist in a database.

### The camp participates.

People have influenced the menu and contributed kitchen labor.

### The menu is operationally complete.

Every meal has been deliberately planned.

### Quantities are understood.

The Kitchen Lead knows how much food is required.

### Shopping is controlled.

The team knows what to buy, how much, who buys it, and what has already been purchased.

### The budget is understood.

There are no major financial surprises.

### Shifts are staffed.

Nobody needs to organize kitchen labor during the festival.

### The kitchen can operate offline.

The printed Master Pack contains what is required.

### Technology disappears.

Once Midburn begins, the product has successfully completed its job.

---

# 48. Core Navigation — Shmifter

The exact labels may evolve during design, but the conceptual destinations are:

**Home**

Current preparation status and next action.

**My Profile**

Food identity, restrictions, allergies, preferences.

**Votes**

Current and completed menu votes.

**Shifts**

Kitchen participation.

**Menu**

Final menu once available.

Navigation should remain minimal.

---

# 49. Core Navigation — Kitchen HQ

Conceptually:

**Overview**

**People**

**Menu**

**Recipes**

**Shifts**

**Shopping**

**Budget**

**Readiness**

The exact information architecture may be refined during implementation if a clearer structure emerges, provided the product requirements remain intact.

---

# 50. High-Level Permission Model

At minimum, distinguish:

## Shmifter

Can manage their own relevant information and participate in available camp activities.

## Kitchen Admin

Can manage kitchen-wide operational information.

The architecture should not make future additional roles impossible, but unnecessary role complexity should not be introduced without a real product need.

---

# 51. Product Scope Priority

When implementation requires prioritization, use this order:

### P0 — Kitchen Safety & Core Planning

- people;
- dietary information;
- allergies;
- meals;
- recipes;
- quantities;
- shifts;
- shopping;
- kitchen readiness.

### P1 — Participation

- voting;
- preference collection;
- final menu reveal;
- member progress.

### P2 — Financial Control

- projected costs;
- actual costs;
- budget;
- cost per person.

### P3 — Delight

- playful interactions;
- richer reveals;
- optional atmospheric details.

Delight is important to Shmifting.

But never build delight while a core kitchen workflow is unreliable.

---

# 52. Scope Discipline

Do not expand the product into unrelated camp operations without an explicit product decision.

Examples that should not automatically enter scope:

- camp accommodation;
- transport;
- general volunteering outside the kitchen;
- camp construction;
- events;
- sound systems;
- art installations;
- general camp finances;
- Midburn social feeds;
- live location;
- messaging.

The kitchen is intentionally the boundary.

---

# 53. Technical Freedom

This document intentionally does **not** prescribe:

- framework;
- database;
- authentication provider;
- hosting;
- state management;
- API architecture;
- UI library;
- deployment strategy;
- PDF implementation;
- notification provider;
- image format;
- infrastructure.

Claude Code should choose appropriate technical solutions based on the product requirements.

Technology should serve the product.

The product should not be redesigned to accommodate an arbitrary technology choice.

---

# 54. Relationship to the Design Book

This Product Bible defines:

> **WHAT we are building and WHY it behaves this way.**

`SHMIFTING_DESIGN_BOOK.md` defines:

> **HOW Shmifting looks, feels, moves, and communicates visually.**

Neither document replaces the other.

When making a functional decision, consult the Product Bible.

When making a visual decision, consult the Design Book and its Golden References.

When both apply, satisfy both.

---

# 55. Implementation Principle for Claude Code

Do not treat this document as a loose brainstorming document.

It is the product specification.

However, do not implement requirements mechanically when doing so would produce an obviously poor product.

You are expected to think like a senior product engineer.

Before making a significant interpretation that changes the intended product behavior, ask:

1. Does it preserve the kitchen-first scope?
2. Does it make preparation easier?
3. Does it increase confidence before Midburn?
4. Does it respect the distinction between Shmifter and Kitchen Admin?
5. Does it help technology disappear once the festival begins?

If yes, proceed thoughtfully.

If not, do not introduce it.

---

# 56. The Final Test

Before considering Shmifting Kitchen complete, imagine the following moment:

The vehicles are packed.

The food has been purchased.

The camp members know their shifts.

Every allergy has been considered.

The recipes are printed.

The quantities are known.

The budget is understood.

The kitchen plan is sitting on paper.

Everyone is about to enter the desert.

Ask one question:

> **Could we turn every phone off right now and still run this kitchen beautifully?**

If the answer is yes:

# SHMIFTING KITCHEN IS READY.

**Feeding people is our gift.**