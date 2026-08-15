import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/shmifting.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
