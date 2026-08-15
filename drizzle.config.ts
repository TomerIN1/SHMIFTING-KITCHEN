import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

/* Next loads .env.local ahead of .env; drizzle-kit is a standalone process and
   has to be told. Without this, a Turso URL kept in .env.local is invisible
   here and `drizzle-kit push` quietly targets the local SQLite file instead —
   you get a successful-looking push against the wrong database. */
dotenv.config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  dialect: "turso",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    /* Blank counts as unset — see the note in lib/db/index.ts. */
    url: process.env.TURSO_DATABASE_URL?.trim() || "file:./data/shmifting.db",
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  },
});
