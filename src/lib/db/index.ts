import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { schema } from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/chorus.db";
if (databaseUrl !== "file:./data/chorus.db") {
  throw new Error("DATABASE_URL must be file:./data/chorus.db for this prototype.");
}

const databaseDirectory = resolve(process.cwd(), "data");
mkdirSync(databaseDirectory, { recursive: true });
const databasePath = resolve(process.cwd(), "data", "chorus.db");

const sqlite = new Database(databasePath);
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });
