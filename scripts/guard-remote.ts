import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

/* ============================================================================
   REMOTE DATABASE GUARD

   These scripts were written when the only database was a file in ./data, so
   the worst a mistyped command could do was cost you a reseed. That stopped
   being true the moment Turso credentials landed in .env.local: the same
   `npm run db:reset` now points at the camp's live database, and would seed
   twenty-four fictional people over real members' allergy data.

   Nothing about the command changes to warn you. So this does: anything
   destructive refuses to run against a database that is not a local file,
   unless you say --allow-remote and mean it.

   This is Bible §24 (surface the operational problem) applied to the tooling
   rather than the product, and it is the cheapest possible insurance against
   the one mistake in this repository that cannot be undone.
   ========================================================================= */

export function assertLocalDatabase(action: string): void {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const isRemote = Boolean(url) && !url!.startsWith("file:");

  if (!isRemote) return;
  if (process.argv.includes("--allow-remote")) {
    console.warn(
      `\n⚠  ${action} is running against a REMOTE database (--allow-remote).\n`,
    );
    return;
  }

  /* Show enough of the host to be recognised, never the credentials. */
  let where = "a remote database";
  try {
    where = new URL(url!).host;
  } catch {
    /* Unparseable is still not a local file. */
  }

  console.error(
    `\nRefusing to ${action}.\n\n` +
      `  TURSO_DATABASE_URL points at ${where}, not a local file.\n` +
      `  That is the camp's live database — real people's dietary and allergy\n` +
      `  data (Bible §34). This script would destroy it.\n\n` +
      `  If you are certain, re-run with --allow-remote.\n` +
      `  To work locally instead, comment TURSO_DATABASE_URL out of .env.local;\n` +
      `  the app falls back to file:./data/shmifting.db.\n`,
  );
  process.exit(1);
}
