import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { nearWalletChallenge, projectMember } from "@/lib/db/schema";
import { canManageProject } from "@/lib/project-access";
import { readJsonBody } from "@/lib/request-json";
import { nearTreasuryChallengeSchema } from "@/lib/near-intents-input";
import { getNearMessageRecipient } from "@/lib/near-wallet";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { projectId } = await params;
  const [membership] = await db
    .select({ role: projectMember.role })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!canManageProject(membership.role)) {
    return NextResponse.json(
      { error: "Project administrator access required." },
      { status: 403 },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = nearTreasuryChallengeSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "NEAR account ID is invalid." }, { status: 400 });
  }

  const now = new Date();
  const challengeId = randomUUID();
  const nonce = randomBytes(32).toString("base64");
  const recipient = getNearMessageRecipient();
  const message = [
    "Verify this NEAR account as the treasury for a Chorus project.",
    `Project: ${projectId}`,
    `Account: ${parsed.data.accountId}`,
    `Challenge: ${challengeId}`,
  ].join("\n");
  await db.transaction((transaction) => {
    transaction
      .delete(nearWalletChallenge)
      .where(
        and(
          eq(nearWalletChallenge.projectId, projectId),
          eq(nearWalletChallenge.userId, session.user.id),
          lt(nearWalletChallenge.expiresAt, now),
        ),
      )
      .run();
    transaction
      .insert(nearWalletChallenge)
      .values({
        id: challengeId,
        projectId,
        userId: session.user.id,
        accountId: parsed.data.accountId,
        nonce,
        expiresAt: new Date(now.getTime() + 5 * 60_000),
        createdAt: now,
      })
      .run();
  });

  return NextResponse.json({
    challengeId,
    accountId: parsed.data.accountId,
    nonce,
    recipient,
    message,
    expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
  });
}
