import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

/* ============================================================================
   SHMIFTING KITCHEN — DATA MODEL
   Follows the Core Product Model, Product Bible §7:

     People → Dietary Needs → Meal Voting → Final Menu → Dishes → Recipes
            → Ingredient Quantities → Shopping → Budget
     People → Kitchen Shifts

     …all converging into KITCHEN READINESS.

   Two rules shape this schema above all others:

   1. Allergies are their own table, never a column on the profile
      (Bible §11: allergy and preference "must not be merged").
   2. Every derived number is derivable, never stored as a fact
      (Bible §22/§42: data should do the boring work) — with an explicit
      nullable override column wherever a human must be able to win
      (Bible §23/§41: humans decide).
   ========================================================================= */

const now = sql`(unixepoch())`;
const id = () => text("id").primaryKey();
const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).notNull().default(now);
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp" }).notNull().default(now);

/* -------------------------------------------------------------------------
   PEOPLE
   ---------------------------------------------------------------------- */

export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    /* Bible §50 — deliberately only two roles. The column is text rather than
       a boolean so a third role can arrive without a migration dance. */
    role: text("role", { enum: ["shmifter", "admin"] })
      .notNull()
      .default("shmifter"),
    avatarUrl: text("avatar_url"),
    /* People drop out. When they do they must vanish from every operational
       calculation — the diner count, dietary coverage, the allergy sheet, the
       shift quota — because cooking for someone who is not in the desert, or
       reserving attention for an allergy that is not there, is exactly the
       kind of error Bible §24 asks the product to prevent.

       Null = coming. A timestamp rather than a boolean so the Kitchen Lead
       can see WHEN somebody dropped out, which matters when a shift suddenly
       has a hole in it.

       Deliberately NOT a deletion: Bible §13 makes closed voting results
       final, and deleting the person would silently rewrite a round the menu
       was already chosen from. Their flames stay counted. */
    notComingAt: integer("not_coming_at", { mode: "timestamp" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

/* One row per person. Its existence is not completion — `completedAt` is,
   because a half-filled profile is operationally the same as none. */
export const foodProfiles = sqliteTable(
  "food_profiles",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dietaryPattern: text("dietary_pattern", {
      enum: ["omnivore", "vegetarian", "vegan"],
    })
      .notNull()
      .default("omnivore"),
    /* 0 = none, 4 = "burn me". Bible §10 asks only for approximate heat. */
    spiceLevel: integer("spice_level").notNull().default(2),
    /* Sensitivities and choices — NOT safety constraints. See `allergies`. */
    restrictions: text("restrictions", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    dislikes: text("dislikes", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    /* "What food would make you happy in the middle of the desert?" */
    wish: text("wish"),
    notes: text("notes"),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("food_profiles_user_idx").on(t.userId)],
);

/* Bible §11 — allergies get their own operational object, with their own
   review lifecycle, because "reported" and "handled" are different states. */
export const allergies = sqliteTable(
  "allergies",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /* Canonical key from lib/domain/allergens.ts, or "other". */
    allergen: text("allergen").notNull(),
    /* Free text when allergen === "other", and for anything unusual. */
    label: text("label"),
    details: text("details"),
    severity: text("severity", {
      enum: ["avoid", "severe", "anaphylaxis"],
    })
      .notNull()
      .default("avoid"),
    /* The Kitchen Lead's review. Null = nobody has looked at this yet. */
    reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
    reviewedBy: text("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("allergies_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------
   CAMP SETTINGS — one row, id = "camp"
   Bible §38: "Deadlines should be configurable where appropriate rather than
   scattered through the product as fixed assumptions."
   ---------------------------------------------------------------------- */

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("camp"),
  campName: text("camp_name").notNull().default("SHMIFTING"),
  /* Camp members self-join with this code rather than being invited one by
     one — the Kitchen Lead has enough work already. Rotatable from HQ. */
  inviteCode: text("invite_code").notNull().default("SHMIFT"),
  /* The countdown on the Shmifter Home: "83 DAYS TO THE DUST". */
  departureDate: integer("departure_date", { mode: "timestamp" }).notNull(),
  festivalStart: integer("festival_start", { mode: "timestamp" }).notNull(),
  festivalEnd: integer("festival_end", { mode: "timestamp" }).notNull(),
  /* NULL means "however many people have joined the camp" — the roster is the
     head count, and it is already the truth (Bible §22: do the boring
     calculation). A number here is the Kitchen Lead overriding that, which
     they will want when people are coming who have not registered yet
     (Bible §23). Same nullable-override shape as meals.expectedDiners.
     Read it through defaultDiners(), never directly. */
  expectedDiners: integer("expected_diners"),
  budgetPerPerson: real("budget_per_person").notNull().default(0),
  currency: text("currency").notNull().default("₪"),
  /* Shift selection has its own gate — Bible §38. */
  shiftsOpenAt: integer("shifts_open_at", { mode: "timestamp" }),
  shiftsPerPerson: integer("shifts_per_person").notNull().default(2),
  /* The final menu is a reveal, not a live feed — Bible §16. */
  menuRevealedAt: integer("menu_revealed_at", { mode: "timestamp" }),
  /* Bible §31 — reviews a human must actively perform. */
  budgetReviewedAt: integer("budget_reviewed_at", { mode: "timestamp" }),
  /* Bible §32 — the final milestone. */
  lockedAt: integer("locked_at", { mode: "timestamp" }),
  lockedBy: text("locked_by"),
  updatedAt: updatedAt(),
});

/* -------------------------------------------------------------------------
   VOTING — Bible §12–§14
   ---------------------------------------------------------------------- */

export const voteRounds = sqliteTable("vote_rounds", {
  id: id(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  mealDate: integer("meal_date", { mode: "timestamp" }),
  mealType: text("meal_type", {
    enum: ["breakfast", "lunch", "dinner", "snack", "other"],
  })
    .notNull()
    .default("dinner"),
  /* Bible §13 — the flame count is configurable, never hard-coded. */
  tokensPerVoter: integer("tokens_per_voter").notNull().default(3),
  status: text("status", { enum: ["upcoming", "open", "closed"] })
    .notNull()
    .default("upcoming"),
  closesAt: integer("closes_at", { mode: "timestamp" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const voteOptions = sqliteTable(
  "vote_options",
  {
    id: id(),
    roundId: text("round_id")
      .notNull()
      .references(() => voteRounds.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    /* Representative dishes, one per line — kept as prose because at voting
       time these are still concepts, not yet operational dish records. */
    dishes: text("dishes"),
    dietaryNote: text("dietary_note"),
    imageUrl: text("image_url"),
    /* Which palette member this concept wears. Design Book §9: colour is
       distributed across the world, not assigned to one primary. */
    accent: text("accent").notNull().default("pink"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("vote_options_round_idx").on(t.roundId)],
);

export const votes = sqliteTable(
  "votes",
  {
    id: id(),
    roundId: text("round_id")
      .notNull()
      .references(() => voteRounds.id, { onDelete: "cascade" }),
    optionId: text("option_id")
      .notNull()
      .references(() => voteOptions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    flames: integer("flames").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("votes_unique_idx").on(t.roundId, t.optionId, t.userId),
    index("votes_round_idx").on(t.roundId),
  ],
);

/* -------------------------------------------------------------------------
   MENU → DISHES → RECIPES → INGREDIENTS — Bible §15–§20
   ---------------------------------------------------------------------- */

export const meals = sqliteTable(
  "meals",
  {
    id: id(),
    date: integer("date", { mode: "timestamp" }).notNull(),
    mealType: text("meal_type", {
      enum: ["breakfast", "lunch", "dinner", "snack"],
    }).notNull(),
    title: text("title").notNull(),
    concept: text("concept"),
    /* Null = "however many people are in camp" (settings.expectedDiners).
       Set only when this meal genuinely differs. */
    expectedDiners: integer("expected_diners"),
    status: text("status", { enum: ["proposed", "review", "final"] })
      .notNull()
      .default("proposed"),
    notes: text("notes"),
    imageUrl: text("image_url"),
    /* Provenance: which vote produced this meal. Bible §13 — voting informs, */
    sourceRoundId: text("source_round_id").references(() => voteRounds.id, {
      onDelete: "set null",
    }),
    /* …and the Lead can knowingly depart from it. Recorded, not hidden. */
    overridesVote: integer("overrides_vote", { mode: "boolean" })
      .notNull()
      .default(false),
    overrideReason: text("override_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("meals_date_idx").on(t.date)],
);

export const dishes = sqliteTable(
  "dishes",
  {
    id: id(),
    mealId: text("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role", {
      enum: ["main", "side", "salad", "sauce", "bread", "dessert", "drink"],
    })
      .notNull()
      .default("main"),
    dietary: text("dietary", { enum: ["omnivore", "vegetarian", "vegan"] })
      .notNull()
      .default("omnivore"),
    /* Manual allergen declaration for dishes with no recipe yet. Merged with
       ingredient-derived allergens by lib/domain/coverage.ts. */
    allergens: text("allergens", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("dishes_meal_idx").on(t.mealId)],
);

export const recipes = sqliteTable(
  "recipes",
  {
    id: id(),
    dishId: text("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /* Bible §19 — the recipe is written at a human scale and scaled up. */
    baseServings: integer("base_servings").notNull().default(6),
    instructions: text("instructions"),
    notes: text("notes"),
    isFinal: integer("is_final", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("recipes_dish_idx").on(t.dishId)],
);

/* Bible §20 — ingredients are reusable entities so quantities can aggregate
   across every recipe that mentions them. */
export const ingredients = sqliteTable(
  "ingredients",
  {
    id: id(),
    name: text("name").notNull(),
    category: text("category").notNull().default("other"),
    defaultUnit: text("default_unit").notNull().default("kg"),
    estimatedUnitCost: real("estimated_unit_cost").notNull().default(0),
    /* Canonical allergen keys carried by this ingredient. This is what makes
       "which dishes conflict with this allergy?" answerable. */
    allergens: text("allergens", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("ingredients_name_idx").on(t.name)],
);

export const recipeItems = sqliteTable(
  "recipe_items",
  {
    id: id(),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    /* Quantity for ONE base batch (recipes.baseServings). */
    quantity: real("quantity").notNull(),
    unit: text("unit").notNull(),
    note: text("note"),
    /* Bible §19/§23 — the Lead may pin the scaled camp quantity by hand when
       the maths produces something a kitchen cannot cook. Null = derive it. */
    scaledOverride: real("scaled_override"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("recipe_items_recipe_idx").on(t.recipeId)],
);

/* -------------------------------------------------------------------------
   SHIFTS — Bible §21–§23
   ---------------------------------------------------------------------- */

export const shifts = sqliteTable(
  "shifts",
  {
    id: id(),
    date: integer("date", { mode: "timestamp" }).notNull(),
    mealType: text("meal_type", {
      enum: ["breakfast", "lunch", "dinner", "prep", "cleanup"],
    }).notNull(),
    label: text("label"),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    requiredPeople: integer("required_people").notNull().default(3),
    mealId: text("meal_id").references(() => meals.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
  },
  (t) => [index("shifts_date_idx").on(t.date)],
);

export const shiftAssignments = sqliteTable(
  "shift_assignments",
  {
    id: id(),
    shiftId: text("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /* Who put them there — matters when the Lead reassigns people. */
    source: text("source", { enum: ["self", "lead"] })
      .notNull()
      .default("self"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("shift_assign_unique_idx").on(t.shiftId, t.userId)],
);

/* -------------------------------------------------------------------------
   SHOPPING & BUDGET — Bible §24–§29
   ---------------------------------------------------------------------- */

export const shoppingItems = sqliteTable(
  "shopping_items",
  {
    id: id(),
    /* Null for the paper towels and bin bags — Bible §29 is explicit that the
       shopping system cannot depend exclusively on recipe ingredients. */
    ingredientId: text("ingredient_id").references(() => ingredients.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    category: text("category").notNull().default("other"),
    unit: text("unit").notNull().default("kg"),
    /* Manual items carry their own quantity here. For recipe-derived items
       this stays null and the number is aggregated live from recipes, so the
       list can never drift from the menu. */
    manualQuantity: real("manual_quantity"),
    /* Bible §26 — "The Kitchen Lead should retain the ability to adjust the
       final shopping quantity." Null = trust the aggregation. */
    quantityOverride: real("quantity_override"),
    estimatedUnitCost: real("estimated_unit_cost"),
    actualCost: real("actual_cost"),
    status: text("status", { enum: ["needed", "assigned", "bought"] })
      .notNull()
      .default("needed"),
    assigneeId: text("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    isManual: integer("is_manual", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("shopping_status_idx").on(t.status)],
);

/* -------------------------------------------------------------------------
   RELATIONS
   ---------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(foodProfiles, {
    fields: [users.id],
    references: [foodProfiles.userId],
  }),
  allergies: many(allergies),
  votes: many(votes),
  shiftAssignments: many(shiftAssignments),
}));

export const foodProfilesRelations = relations(foodProfiles, ({ one }) => ({
  user: one(users, { fields: [foodProfiles.userId], references: [users.id] }),
}));

export const allergiesRelations = relations(allergies, ({ one }) => ({
  user: one(users, { fields: [allergies.userId], references: [users.id] }),
}));

export const voteRoundsRelations = relations(voteRounds, ({ many }) => ({
  options: many(voteOptions),
  votes: many(votes),
}));

export const voteOptionsRelations = relations(voteOptions, ({ one, many }) => ({
  round: one(voteRounds, {
    fields: [voteOptions.roundId],
    references: [voteRounds.id],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  round: one(voteRounds, { fields: [votes.roundId], references: [voteRounds.id] }),
  option: one(voteOptions, {
    fields: [votes.optionId],
    references: [voteOptions.id],
  }),
  user: one(users, { fields: [votes.userId], references: [users.id] }),
}));

export const mealsRelations = relations(meals, ({ many, one }) => ({
  dishes: many(dishes),
  shifts: many(shifts),
  sourceRound: one(voteRounds, {
    fields: [meals.sourceRoundId],
    references: [voteRounds.id],
  }),
}));

export const dishesRelations = relations(dishes, ({ one }) => ({
  meal: one(meals, { fields: [dishes.mealId], references: [meals.id] }),
  recipe: one(recipes, { fields: [dishes.id], references: [recipes.dishId] }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  dish: one(dishes, { fields: [recipes.dishId], references: [dishes.id] }),
  items: many(recipeItems),
}));

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeItems.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeItems.ingredientId],
    references: [ingredients.id],
  }),
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  recipeItems: many(recipeItems),
  shoppingItems: many(shoppingItems),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  meal: one(meals, { fields: [shifts.mealId], references: [meals.id] }),
  assignments: many(shiftAssignments),
}));

export const shiftAssignmentsRelations = relations(
  shiftAssignments,
  ({ one }) => ({
    shift: one(shifts, {
      fields: [shiftAssignments.shiftId],
      references: [shifts.id],
    }),
    user: one(users, {
      fields: [shiftAssignments.userId],
      references: [users.id],
    }),
  }),
);

export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
  ingredient: one(ingredients, {
    fields: [shoppingItems.ingredientId],
    references: [ingredients.id],
  }),
  assignee: one(users, {
    fields: [shoppingItems.assigneeId],
    references: [users.id],
  }),
}));

/* -------------------------------------------------------------------------
   TYPES
   ---------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type FoodProfile = typeof foodProfiles.$inferSelect;
export type Allergy = typeof allergies.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type VoteRound = typeof voteRounds.$inferSelect;
export type VoteOption = typeof voteOptions.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type Dish = typeof dishes.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type RecipeItem = typeof recipeItems.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

export type DietaryPattern = FoodProfile["dietaryPattern"];
export type MealType = Meal["mealType"];
export type AllergySeverity = Allergy["severity"];
