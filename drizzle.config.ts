import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/chorus.db";
if (databaseUrl !== "file:./data/chorus.db") {
  throw new Error("DATABASE_URL must be file:./data/chorus.db for this prototype.");
}
mkdirSync(resolve(process.cwd(), "data"), {
  recursive: true,
});

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
