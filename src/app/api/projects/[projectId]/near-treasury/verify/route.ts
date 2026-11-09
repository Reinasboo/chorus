import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityEvent,
  nearWalletChallenge,
  project,
  projectMember,
} from "@/lib/db/schema";
import { canManageProject } from "@/lib/project-access";
import { readJsonBody } from "@/lib/request-json";
import { nearTreasuryVerificationSchema } from "@/lib/near-intents-input";
import { verifyNearWalletSignature } from "@/lib/near-wallet";

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
  const parsed = nearTreasuryVerificationSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "NEAR wallet signature details are invalid." },
      { status: 400 },
    );
  }
  const [challenge] = await db
    .select()
    .from(nearWalletChallenge)
    .where(
      and(
        eq(nearWalletChallenge.id, parsed.data.challengeId),
        eq(nearWalletChallenge.projectId, projectId),
        eq(nearWalletChallenge.userId, session.user.id),
      ),
    )
    .limit(1);
  const now = new Date();
  if (
    !challenge ||
    challenge.accountId !== parsed.data.accountId ||
    challenge.consumedAt ||
    challenge.expiresAt.getTime() <= now.getTime()
  ) {
    return NextResponse.json(
      { error: "The NEAR wallet challenge is missing, expired, or already used." },
      { status: 409 },
    );
  }

  const message = [
    "Verify this NEAR account as the treasury for a Chorus project.",
    `Project: ${projectId}`,
    `Account: ${challenge.accountId}`,
    `Challenge: ${challenge.id}`,
  ].join("\n");
  const signature = Buffer.from(parsed.data.signature, "base64");
  if (signature.length < 64 || signature.length > 128) {
    return NextResponse.json({ error: "NEAR wallet signature is invalid." }, { status: 400 });
  }

  try {
    await verifyNearWalletSignature({
      accountId: challenge.accountId,
      publicKey: parsed.data.publicKey,
      signature,
      message,
      recipient: new URL(
        process.env.NEXT_PUBLIC_APP_URL ??
          process.env.BETTER_AUTH_URL ??
          "http://localhost:3000",
      ).host,
      nonce: Buffer.from(challenge.nonce, "base64"),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      /signature verification failed|does not have FullAccess|unsupported public key/i.test(
        error.message,
      )
    ) {
      return NextResponse.json(
        { error: "NEAR wallet signature could not be verified for this account." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "NEAR RPC could not verify wallet ownership. Please retry." },
      { status: 502 },
    );
  }

  const result = await db.transaction((transaction) => {
    const [currentChallenge] = transaction
      .select()
      .from(nearWalletChallenge)
      .where(eq(nearWalletChallenge.id, challenge.id))
      .limit(1)
      .all();
    if (
      !currentChallenge ||
      currentChallenge.consumedAt ||
      currentChallenge.expiresAt.getTime() <= now.getTime()
    ) {
      return { kind: "conflict" as const };
    }
    transaction
      .update(nearWalletChallenge)
      .set({ consumedAt: now })
      .where(eq(nearWalletChallenge.id, challenge.id))
      .run();
    transaction
      .update(project)
      .set({
        nearTreasuryAccount: challenge.accountId,
        nearTreasuryVerifiedAt: now,
        nearTreasuryVerifiedBy: session.user.id,
        updatedAt: now,
      })
      .where(eq(project.id, projectId))
      .run();
    transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: "project.near_treasury_verified",
        entityType: "project",
        entityId: projectId,
        details: JSON.stringify({
          accountId: challenge.accountId,
          verification: "NEP-413",
        }),
        createdAt: now,
      })
      .run();
    return { kind: "verified" as const };
  });

  if (result.kind === "conflict") {
    return NextResponse.json(
      { error: "The NEAR wallet challenge has expired or already been used." },
      { status: 409 },
    );
  }
  return NextResponse.json({
    accountId: challenge.accountId,
    verifiedAt: now.toISOString(),
  });
}
