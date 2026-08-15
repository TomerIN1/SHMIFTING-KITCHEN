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
   ========================================================================= */

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/shmifting.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
export type DB = typeof db;
