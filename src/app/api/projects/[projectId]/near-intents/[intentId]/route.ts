import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityEvent,
  contribution,
  nearIntentPayment,
  project,
  projectMember,
} from "@/lib/db/schema";
import { nearIntentDepositSchema } from "@/lib/near-intents-input";
import {
  getNearIntentStatus,
  submitNearDeposit,
} from "@/lib/near-intents";
import {
  canTransitionNearIntentStatus,
  nearIntentTerminalStatuses,
  statusMatchesPayment,
} from "@/lib/near-intents-contract";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = {
  params: Promise<{ projectId: string; intentId: string }>;
};

async function getMembership(projectId: string, userId: string) {
  const [membership] = await db
    .select({ projectId: projectMember.projectId })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, userId),
      ),
    )
    .limit(1);
  return membership;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { projectId, intentId } = await params;
  const membership = await getMembership(projectId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = nearIntentDepositSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "NEAR transaction hash is invalid." }, { status: 400 });
  }
  const [payment] = await db
    .select()
    .from(nearIntentPayment)
    .where(
      and(
        eq(nearIntentPayment.id, intentId),
        eq(nearIntentPayment.projectId, projectId),
        eq(nearIntentPayment.contributorId, session.user.id),
      ),
    )
    .limit(1);
  if (!payment) {
    return NextResponse.json({ error: "NEAR Intents payment not found." }, { status: 404 });
  }
  const [currentProject] = await db
    .select({
      status: project.status,
      nearTreasuryAccount: project.nearTreasuryAccount,
      nearTreasuryVerifiedAt: project.nearTreasuryVerifiedAt,
    })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  if (
    currentProject?.status !== "active" ||
    currentProject.nearTreasuryAccount !== payment.recipientAccount ||
    !currentProject.nearTreasuryVerifiedAt
  ) {
    return NextResponse.json(
      { error: "The project or its NEAR treasury changed after this quote. Do not send this deposit." },
      { status: 409 },
    );
  }
  if (nearIntentTerminalStatuses.has(payment.status)) {
    return NextResponse.json(
      { error: "This NEAR Intents payment is already in a terminal state." },
      { status: 409 },
    );
  }
  if (
    payment.depositTransactionHash &&
    payment.depositTransactionHash !== parsed.data.transactionHash
  ) {
    return NextResponse.json(
      { error: "A different NEAR deposit transaction is already attached to this quote." },
      { status: 409 },
    );
  }

  const now = new Date();
  const stored = await db.transaction((transaction) => {
    const [freshProject] = transaction
      .select({
        status: project.status,
        nearTreasuryAccount: project.nearTreasuryAccount,
        nearTreasuryVerifiedAt: project.nearTreasuryVerifiedAt,
      })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
      .all();
    if (
      freshProject?.status !== "active" ||
      freshProject.nearTreasuryAccount !== payment.recipientAccount ||
      !freshProject.nearTreasuryVerifiedAt
    ) {
      return { kind: "project_changed" as const };
    }
    const [currentPayment] = transaction
      .select()
      .from(nearIntentPayment)
      .where(eq(nearIntentPayment.id, intentId))
      .limit(1)
      .all();
    if (!currentPayment) return { kind: "not_found" as const };
    if (nearIntentTerminalStatuses.has(currentPayment.status)) {
      return { kind: "terminal" as const };
    }
    if (
      currentPayment.depositTransactionHash &&
      currentPayment.depositTransactionHash !== parsed.data.transactionHash
    ) {
      return { kind: "different_hash" as const };
    }
    transaction
      .update(nearIntentPayment)
      .set({
        depositTransactionHash: parsed.data.transactionHash,
        updatedAt: now,
      })
      .where(eq(nearIntentPayment.id, intentId))
      .run();
    if (!currentPayment.depositTransactionHash) {
      transaction
        .insert(activityEvent)
        .values({
          id: randomUUID(),
          projectId,
          actorId: session.user.id,
          action: "contribution.near_intents_deposit_submitted",
          entityType: "near_intent_payment",
          entityId: intentId,
          details: JSON.stringify({
            correlationId: payment.correlationId,
            transactionHash: parsed.data.transactionHash,
          }),
          createdAt: now,
        })
        .run();
    }
    return { kind: "stored" as const };
  });
  if (stored.kind === "not_found") {
    return NextResponse.json({ error: "NEAR Intents payment not found." }, { status: 404 });
  }
  if (stored.kind === "terminal") {
    return NextResponse.json(
      { error: "This NEAR Intents payment is already in a terminal state." },
      { status: 409 },
    );
  }
  if (stored.kind === "different_hash") {
    return NextResponse.json(
      { error: "A different NEAR deposit transaction is already attached to this quote." },
      { status: 409 },
    );
  }
  if (stored.kind === "project_changed") {
    return NextResponse.json(
      { error: "The project or its NEAR treasury changed after this quote. Do not send this deposit." },
      { status: 409 },
    );
  }

  try {
    await submitNearDeposit({
      depositAddress: payment.depositAddress,
      transactionHash: parsed.data.transactionHash,
      payerAccount: payment.payerAccount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Deposit was submitted to NEAR, but its Intents notification failed: ${error.message}`
            : "Deposit was submitted to NEAR, but its Intents notification failed.",
        transactionRecorded: true,
      },
      { status: 502 },
    );
  }
  return NextResponse.json({
    transactionRecorded: true,
    status: payment.status,
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { projectId, intentId } = await params;
  const membership = await getMembership(projectId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const [payment] = await db
    .select()
    .from(nearIntentPayment)
    .where(
      and(
        eq(nearIntentPayment.id, intentId),
        eq(nearIntentPayment.projectId, projectId),
      ),
    )
    .limit(1);
  if (!payment) {
    return NextResponse.json({ error: "NEAR Intents payment not found." }, { status: 404 });
  }
  if (nearIntentTerminalStatuses.has(payment.status)) {
    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      correlationId: payment.correlationId,
      destinationTransactionHash: payment.destinationTransactionHash,
      updatedAt: payment.updatedAt.toISOString(),
    });
  }

  let providerStatus;
  try {
    providerStatus = await getNearIntentStatus(payment.depositAddress);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "NEAR Intents status is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
  const { matches, transactionHash } = statusMatchesPayment(providerStatus, {
    correlationId: payment.correlationId,
    amountOut: payment.amountOut,
    originAssetId: payment.originAssetId,
    destinationAssetId: payment.destinationAssetId,
    recipientAccount: payment.recipientAccount,
    payerAccount: payment.payerAccount,
  });
  const nextStatus = matches ? providerStatus.status : "VERIFICATION_FAILED";
  const now = new Date();
  const [contributionRecord] = await db
    .select({ id: contribution.id })
    .from(contribution)
    .where(eq(contribution.id, payment.contributionId))
    .limit(1);
  if (!contributionRecord) {
    return NextResponse.json(
      { error: "The contribution linked to this payment no longer exists." },
      { status: 409 },
    );
  }
  const terminal = nearIntentTerminalStatuses.has(nextStatus);
  const successful = nextStatus === "SUCCESS";
  const failed = terminal && !successful;
  const applied = await db.transaction((transaction) => {
    const [currentPayment] = transaction
      .select({
        status: nearIntentPayment.status,
        destinationTransactionHash: nearIntentPayment.destinationTransactionHash,
        updatedAt: nearIntentPayment.updatedAt,
      })
      .from(nearIntentPayment)
      .where(eq(nearIntentPayment.id, intentId))
      .limit(1)
      .all();
    if (!currentPayment) return { status: "VERIFICATION_FAILED", updatedAt: now };
    if (nearIntentTerminalStatuses.has(currentPayment.status)) {
      return {
        status: currentPayment.status,
        destinationTransactionHash: currentPayment.destinationTransactionHash,
        updatedAt: currentPayment.updatedAt,
      };
    }

    if (!canTransitionNearIntentStatus(currentPayment.status, nextStatus)) {
      return {
        status: currentPayment.status,
        destinationTransactionHash: currentPayment.destinationTransactionHash,
        updatedAt: currentPayment.updatedAt,
      };
    }

    transaction
      .update(nearIntentPayment)
      .set({
        status: nextStatus,
        destinationTransactionHash: successful ? transactionHash : null,
        statusEvidence: JSON.stringify({
          status: providerStatus.status,
          correlationId: providerStatus.correlationId,
          updatedAt: now.toISOString(),
          mismatch: !matches,
        }),
        updatedAt: now,
      })
      .where(eq(nearIntentPayment.id, intentId))
      .run();
    if (failed) {
      transaction
        .update(contribution)
        .set({ status: "failed", updatedAt: now })
        .where(eq(contribution.id, payment.contributionId))
        .run();
    }
    if (currentPayment.status !== nextStatus) {
      transaction
        .insert(activityEvent)
        .values({
          id: randomUUID(),
          projectId,
          actorId: null,
          action: successful
            ? "contribution.near_intents_provider_reported_success"
            : failed
              ? "contribution.near_intents_failed"
              : "contribution.near_intents_status_updated",
          entityType: "near_intent_payment",
          entityId: intentId,
          details: JSON.stringify({
            correlationId: payment.correlationId,
            providerReportedStatus: providerStatus.status,
            amountOut: successful ? payment.amountOut : undefined,
            transactionHash: successful ? transactionHash : undefined,
          }),
          createdAt: now,
        })
        .run();
    }
    return {
      status: nextStatus,
      destinationTransactionHash: successful ? transactionHash : null,
      updatedAt: now,
    };
  });

  return NextResponse.json({
    id: payment.id,
    status: applied.status,
    correlationId: payment.correlationId,
    destinationTransactionHash: applied.destinationTransactionHash ?? null,
    updatedAt: applied.updatedAt.toISOString(),
    statusNotice: applied.status === "SUCCESS"
      ? "NEAR Intents reports SUCCESS and the quote scope matched. The destination transaction has not been independently reconciled against NEAR."
      : nearIntentTerminalStatuses.has(applied.status)
        ? "NEAR Intents reported a terminal non-success result; this contribution is not counted as verified."
        : "Awaiting NEAR Intents settlement status.",
  });
}
