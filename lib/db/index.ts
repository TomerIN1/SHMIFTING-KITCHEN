import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/* ============================================================================
   DATABASE
   libSQL/SQLite. Chosen deliberately (CLAUDE.md §25 — do not over-engineer):

   - This is one camp. Tens of people, hundreds of rows. Not a scale problem.
   - Local development needs zero credentials and zero running services.
   - The same driver talks to Turso in production by setting two env vars,
     so shipping never requires a rewrite.

   The file lives in ./data/ which is gitignored — the database is camp
   members' personal dietary and allergy data (Bible §34) and never belongs
   in version control.

   A local file is development only. Serverless hosts have a read-only,
   ephemeral filesystem, so a deployment MUST set TURSO_DATABASE_URL and
   TURSO_AUTH_TOKEN or it will start up fine and then fail the moment anybody
   tries to save anything.
   ========================================================================= */

/* An unset variable in a hosting dashboard usually arrives as "" rather than
   undefined, and `??` only catches null and undefined. That one character
   killed a Vercel build with `URL_INVALID: The URL '' is not in a valid
   format` — thrown at import, during "Collecting page data", which reads as a
   mysterious page error rather than a missing setting. `||` treats blank as
   absent, which is what a human means by it. */
const url = process.env.TURSO_DATABASE_URL?.trim() || "file:./data/shmifting.db";
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
export type DB = typeof db;
