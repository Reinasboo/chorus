import { randomUUID } from "node:crypto";
import { and, eq, gte } from "drizzle-orm";
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
import { parseUsdToMinorUnits } from "@/lib/money";
import { nearIntentContributionSchema } from "@/lib/near-intents-input";
import { createNearUsdcQuote } from "@/lib/near-intents";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = { params: Promise<{ projectId: string }> };

function quoteView(payment: typeof nearIntentPayment.$inferSelect) {
  return {
    id: payment.id,
    correlationId: payment.correlationId,
    depositAddress: payment.depositAddress,
    payerAccount: payment.payerAccount,
    recipientAccount: payment.recipientAccount,
    originAssetId: payment.originAssetId,
    originTokenContract: payment.originTokenContract,
    destinationAssetId: payment.destinationAssetId,
    amountIn: payment.amountIn,
    maxAmountIn: payment.maxAmountIn,
    amountOut: payment.amountOut,
    deadline: payment.deadline.toISOString(),
    status: payment.status,
    depositTransactionHash: payment.depositTransactionHash,
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { projectId } = await params;
  const [membership] = await db
    .select({
      role: projectMember.role,
      status: project.status,
      targetAmountMinor: project.targetAmountMinor,
      nearTreasuryAccount: project.nearTreasuryAccount,
      nearTreasuryVerifiedAt: project.nearTreasuryVerifiedAt,
    })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
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
  if (membership.status !== "active") {
    return NextResponse.json(
      { error: "Contributions require an active project." },
      { status: 409 },
    );
  }
  if (!membership.nearTreasuryAccount || !membership.nearTreasuryVerifiedAt) {
    return NextResponse.json(
      { error: "A project owner must verify a NEAR treasury account first." },
      { status: 409 },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = nearIntentContributionSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "NEAR Intents contribution details are invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const amountMinor = parseUsdToMinorUnits(parsed.data.amount);
  if (!amountMinor) {
    return NextResponse.json({ error: "Contribution amount is invalid." }, { status: 400 });
  }
  if (BigInt(amountMinor) > BigInt(membership.targetAmountMinor)) {
    return NextResponse.json(
      { error: "A single contribution cannot exceed the project target." },
      { status: 409 },
    );
  }

  const [existing] = await db
    .select()
    .from(nearIntentPayment)
    .where(
      and(
        eq(nearIntentPayment.projectId, projectId),
        eq(nearIntentPayment.contributorId, session.user.id),
        eq(nearIntentPayment.idempotencyKey, parsed.data.idempotencyKey),
      ),
    )
    .limit(1);
  if (existing) {
    const [existingContribution] = await db
      .select({ amountMinor: contribution.amountMinor })
      .from(contribution)
      .where(eq(contribution.id, existing.contributionId))
      .limit(1);
    if (
      existing.payerAccount !== parsed.data.payerAccount ||
      existing.recipientAccount !== membership.nearTreasuryAccount ||
      existingContribution?.amountMinor !== amountMinor
    ) {
      return NextResponse.json(
        { error: "This idempotency key was already used for a different payment." },
        { status: 409 },
      );
    }
    if (existing.deadline.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This quote expired. Start a new contribution to request another quote." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { payment: quoteView(existing), idempotent: true, apiKeyConfigured: Boolean(process.env.NEAR_INTENTS_API_KEY) },
      { status: 200 },
    );
  }

  const recentQuotes = await db
    .select({ id: nearIntentPayment.id })
    .from(nearIntentPayment)
    .where(
      and(
        eq(nearIntentPayment.projectId, projectId),
        eq(nearIntentPayment.contributorId, session.user.id),
        gte(
          nearIntentPayment.createdAt,
          new Date(Date.now() - 10 * 60_000),
        ),
      ),
    )
    .limit(5);
  if (recentQuotes.length >= 5) {
    return NextResponse.json(
      { error: "Too many recent NEAR Intents quotes. Wait before requesting another." },
      { status: 429 },
    );
  }

  let quote;
  try {
    quote = await createNearUsdcQuote({
      amountMinor,
      payerAccount: parsed.data.payerAccount,
      recipientAccount: membership.nearTreasuryAccount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "NEAR Intents could not create a quote.",
      },
      { status: 502 },
    );
  }

  const now = new Date();
  const paymentId = randomUUID();
  const contributionId = randomUUID();
  const result = await db.transaction((transaction) => {
    const [duplicate] = transaction
      .select()
      .from(nearIntentPayment)
      .where(
        and(
          eq(nearIntentPayment.projectId, projectId),
          eq(nearIntentPayment.contributorId, session.user.id),
          eq(nearIntentPayment.idempotencyKey, parsed.data.idempotencyKey),
        ),
      )
      .limit(1)
      .all();
    if (duplicate) return { kind: "duplicate" as const, payment: duplicate };
    const [currentProject] = transaction
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
      currentProject?.status !== "active" ||
      currentProject.nearTreasuryAccount !== membership.nearTreasuryAccount ||
      !currentProject.nearTreasuryVerifiedAt
    ) {
      return { kind: "project_changed" as const };
    }

    transaction
      .insert(contribution)
      .values({
        id: contributionId,
        projectId,
        contributorId: session.user.id,
        idempotencyKey: parsed.data.idempotencyKey,
        amountMinor,
        currency: "USD",
        source: "payment_adapter",
        status: "pending",
        note: "NEAR Intents contribution · USDC at nominal USD face value",
        externalReference: quote.correlationId,
        refundedAmountMinor: "0",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const payment = {
      id: paymentId,
      projectId,
      contributionId,
      contributorId: session.user.id,
      idempotencyKey: parsed.data.idempotencyKey,
      correlationId: quote.correlationId,
      depositAddress: quote.depositAddress,
      payerAccount: parsed.data.payerAccount,
      recipientAccount: membership.nearTreasuryAccount!,
      originAssetId: quote.originAssetId,
      destinationAssetId: quote.destinationAssetId,
      originTokenContract: quote.originTokenContract,
      destinationTokenContract: quote.destinationTokenContract,
      amountIn: quote.amountIn,
      maxAmountIn: quote.maxAmountIn,
      amountOut: quote.amountOut,
      deadline: quote.deadline,
      status: "PENDING_DEPOSIT",
      depositTransactionHash: null,
      destinationTransactionHash: null,
      statusEvidence: null,
      createdAt: now,
      updatedAt: now,
    };
    transaction.insert(nearIntentPayment).values(payment).run();
    transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: "contribution.near_intents_quote_created",
        entityType: "near_intent_payment",
        entityId: paymentId,
        details: JSON.stringify({
          amountMinor,
          currency: "USD",
          destinationAssetId: quote.destinationAssetId,
          recipientAccount: membership.nearTreasuryAccount,
          correlationId: quote.correlationId,
        }),
        createdAt: now,
      })
      .run();
    return { kind: "created" as const, payment };
  });

  if (result.kind === "project_changed") {
    return NextResponse.json(
      { error: "The project treasury changed while the quote was being created. Request a fresh quote." },
      { status: 409 },
    );
  }
  if (result.kind === "duplicate") {
    if (
      result.payment.payerAccount !== parsed.data.payerAccount ||
      result.payment.deadline.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "A quote already exists for this request. Start a new contribution." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { payment: quoteView(result.payment), idempotent: true, apiKeyConfigured: Boolean(process.env.NEAR_INTENTS_API_KEY) },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      payment: {
        ...quoteView(result.payment),
        amountInFormatted: quote.amountInFormatted,
        amountOutFormatted: quote.amountOutFormatted,
        minAmountIn: quote.minAmountIn,
        maxAmountIn: quote.maxAmountIn,
      },
      idempotent: false,
      apiKeyConfigured: Boolean(process.env.NEAR_INTENTS_API_KEY),
      trustNotice:
        "NEAR Intents temporarily handles the swap. Only a wallet-approved deposit can start it.",
    },
    { status: 201 },
  );
}
