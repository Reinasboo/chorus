import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

export async function getCurrentSession() {
  await connection();
  return auth.api.getSession({ headers: await headers() });
}
