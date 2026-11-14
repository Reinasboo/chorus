import "server-only";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { schema } from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must point to the Supabase Postgres database.");
}

const client = postgres(databaseUrl, {
  connect_timeout: 10,
  idle_timeout: 20,
  max: 1,
  prepare: false,
});

export const db = drizzle(client, { schema });
