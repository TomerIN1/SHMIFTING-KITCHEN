import "dotenv/config";
import { eq, ne } from "drizzle-orm";
import { db } from "../lib/db";
import * as s from "../lib/db/schema";

/* ============================================================================
   FRESH START — clear the demo camp and keep one Kitchen Lead.

   Every real deployment of this product begins the same way: the seed is
   fiction, and at some point a real camp has to replace it. This is that
   moment, made repeatable instead of hand-typed.

   By default it removes only PEOPLE. Deleting a person cascades to their
   profile, allergies, votes and shift assignments, so the camp roster empties
   cleanly while the menu, recipes and ingredient catalogue survive — those
   are often worth keeping as a starting point.

   Pass --all to clear the kitchen content too.

     npx tsx scripts/fresh-start.ts --keep=tomer@shmifting.camp
     npx tsx scripts/fresh-start.ts --keep=me@example.com --name="תומר נבו"
     npx tsx scripts/fresh-start.ts --keep=me@example.com --email=real@me.com
     npx tsx scripts/fresh-start.ts --keep=me@example.com --all
     npx tsx scripts/fresh-start.ts --keep=me@example.com --dry-run

   --email rewrites the surviving account's address. The seed ships fake
   @shmifting.camp addresses and there is no self-service way to change your
   own email in the product, so this is the escape hatch.

   The kept account is promoted to admin, because a camp with no Kitchen Lead
   cannot be administered back into existence through the UI.
   ========================================================================= */

const argv = process.argv.slice(2);
const arg = (name: string) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const keepEmail = arg("keep")?.trim().toLowerCase();
const newName = arg("name")?.trim();
const newEmail = arg("email")?.trim().toLowerCase();
const clearAll = argv.includes("--all");
const dryRun = argv.includes("--dry-run");

async function main() {
  if (!keepEmail) {
    console.error(
      "Which account should survive?\n" +
        "  npx tsx scripts/fresh-start.ts --keep=you@example.com\n",
    );
    process.exit(1);
  }

  const keeper = await db.query.users.findFirst({
    where: eq(s.users.email, keepEmail),
  });

  if (!keeper) {
    const all = await db.query.users.findMany();
    console.error(
      `No account with the email "${keepEmail}".\n\n` +
        `Accounts on record:\n` +
        all.map((u) => `  ${u.email}  (${u.name})`).join("\n"),
    );
    process.exit(1);
  }

  if (newEmail) {
    const clash = await db.query.users.findFirst({
      where: eq(s.users.email, newEmail),
    });
    if (clash && clash.id !== keeper.id) {
      console.error(`"${newEmail}" already belongs to ${clash.name}.`);
      process.exit(1);
    }
  }

  const everyone = await db.query.users.findMany({
    with: { profile: true, allergies: true },
  });
  const doomed = everyone.filter((u) => u.id !== keeper.id);

  console.log(`\nKeeping:  ${keeper.name} <${keeper.email}>`);
  if (newName && newName !== keeper.name) {
    console.log(`Renaming: ${keeper.name} → ${newName}`);
  }
  if (newEmail && newEmail !== keeper.email) {
    console.log(`New email: ${keeper.email} → ${newEmail}`);
  }
  if (keeper.role !== "admin") {
    console.log(`Promoting to Kitchen Lead.`);
  }
  console.log(`\nRemoving ${doomed.length} people:`);
  for (const u of doomed) {
    const bits = [
      u.profile?.completedAt ? "profile" : null,
      u.allergies.length ? `${u.allergies.length} allergies` : null,
    ].filter(Boolean);
    console.log(
      `  · ${u.name.padEnd(10)} ${u.email}${bits.length ? `  (${bits.join(", ")})` : ""}`,
    );
  }

  if (clearAll) {
    console.log(
      `\nAlso clearing: shopping, shifts, recipes, dishes, meals, ingredients, votes.`,
    );
  } else {
    console.log(
      `\nKeeping the kitchen content (menu, recipes, ingredients, shifts).\n` +
        `Pass --all to clear that too.`,
    );
  }

  if (dryRun) {
    console.log(`\n--dry-run: nothing was changed.`);
    return;
  }

  if (clearAll) {
    /* Children before parents. Ingredients are referenced by recipe lines
       with onDelete: restrict, so those have to go first. */
    await db.delete(s.shoppingItems);
    await db.delete(s.shiftAssignments);
    await db.delete(s.shifts);
    await db.delete(s.recipeItems);
    await db.delete(s.recipes);
    await db.delete(s.dishes);
    await db.delete(s.meals);
    await db.delete(s.ingredients);
    await db.delete(s.votes);
    await db.delete(s.voteOptions);
    await db.delete(s.voteRounds);
  }

  /* Cascades to profiles, allergies, votes and shift assignments. */
  await db.delete(s.users).where(ne(s.users.id, keeper.id));

  await db
    .update(s.users)
    .set({
      role: "admin",
      ...(newName ? { name: newName } : {}),
      ...(newEmail ? { email: newEmail } : {}),
      notComingAt: null,
      updatedAt: new Date(),
    })
    .where(eq(s.users.id, keeper.id));

  /* The camp is now one person until people join. Leaving the diner count at
     the demo's 24 would silently multiply every future recipe by a number
     nobody chose. */
  await db
    .update(s.settings)
    .set({ expectedDiners: 1, menuRevealedAt: null, updatedAt: new Date() })
    .where(eq(s.settings.id, "camp"));

  const remaining = await db.query.users.findMany();
  const camp = await db.query.settings.findFirst();

  console.log(`\nDone.`);
  console.log(`  people:        ${remaining.length}`);
  console.log(`  kitchen lead:  ${remaining[0]?.name} <${remaining[0]?.email}>`);
  console.log(`  invite code:   ${camp?.inviteCode}`);
  console.log(`  diner count:   ${camp?.expectedDiners}  (set the real one in HQ → תקציב)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
