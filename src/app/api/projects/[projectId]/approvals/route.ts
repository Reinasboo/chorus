import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityEvent,
  contribution,
  project,
  projectMember,
  projectSpendingPolicy,
  purchaseApproval,
  user,
} from "@/lib/db/schema";
import { summarizeContributions } from "@/lib/contribution-ledger";
import { parseUsdToMinorUnits } from "@/lib/money";
import { purchaseApprovalRequestSchema } from "@/lib/spending-input";
import { authorizePurchaseRequest } from "@/lib/spending-policy";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = { params: Promise<{ projectId: string }> };

function decodeList(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Stored spending policy lists are invalid.");
  }
  return parsed;
}

export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { projectId } = await params;
  const [membership] = await db
    .select({ projectId: projectMember.projectId })
    .from(projectMember)
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, session.user.id)))
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const records = await db
    .select({
      id: purchaseApproval.id,
      task: purchaseApproval.task,
      purpose: purchaseApproval.purpose,
      category: purchaseApproval.category,
      providerId: purchaseApproval.providerId,
      offerReference: purchaseApproval.offerReference,
      amountMinor: purchaseApproval.amountMinor,
      currency: purchaseApproval.currency,
      status: purchaseApproval.status,
      policyVersion: purchaseApproval.policyVersion,
      expiresAt: purchaseApproval.expiresAt,
      approvedAt: purchaseApproval.approvedAt,
      createdAt: purchaseApproval.createdAt,
      requestorId: purchaseApproval.requestorId,
      approverId: purchaseApproval.approverId,
    })
    .from(purchaseApproval)
    .where(eq(purchaseApproval.projectId, projectId))
    .orderBy(desc(purchaseApproval.createdAt))
    .limit(100);
  const memberIds = [
    ...new Set(
      records.flatMap((record) =>
        record.approverId
          ? [record.requestorId, record.approverId]
          : [record.requestorId],
      ),
    ),
  ];
  const members = memberIds.length
    ? await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, memberIds))
    : [];
  const memberNames = new Map(members.map((member) => [member.id, member.name]));

  return NextResponse.json({
    approvals: records.map((record) => ({
      id: record.id,
      task: record.task,
      purpose: record.purpose,
      category: record.category,
      providerId: record.providerId,
      offerReference: record.offerReference,
      amountMinor: record.amountMinor,
      currency: record.currency,
      expiresAt: record.expiresAt.toISOString(),
      approvedAt: record.approvedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      policyVersion: record.policyVersion,
      status:
        ["pending", "approved"].includes(record.status) &&
        record.expiresAt.getTime() <= Date.now()
          ? "expired"
          : record.status,
      requestorName: memberNames.get(record.requestorId) ?? "Former member",
      approverName: record.approverId
        ? memberNames.get(record.approverId) ?? "Former member"
        : null,
    })),
    paymentsEnabled: false,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { projectId } = await params;
  const [membership] = await db
    .select({ status: project.status })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, session.user.id)))
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (membership.status !== "active") {
    return NextResponse.json({ error: "Purchase requests require an active project." }, { status: 409 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = purchaseApprovalRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Purchase request is invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const amountMinor = parseUsdToMinorUnits(parsed.data.amount);
  if (!amountMinor) {
    return NextResponse.json({ error: "Purchase amount is invalid." }, { status: 400 });
  }

  const now = new Date();
  const normalizedScope = {
    amountMinor,
    currency: "USD",
    category: parsed.data.category.toLowerCase(),
    providerId: parsed.data.providerId.toLowerCase(),
  };
  const result = await db.transaction(async (transaction) => {
    const [currentProject] = await transaction
      .select({ status: project.status })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);
    if (currentProject?.status !== "active") {
      return {
        kind: "denied" as const,
        error: "Purchase requests require an active project.",
      };
    }

    const [existing] = await transaction
      .select()
      .from(purchaseApproval)
      .where(
        and(
          eq(purchaseApproval.projectId, projectId),
          eq(purchaseApproval.requestorId, session.user.id),
          eq(purchaseApproval.idempotencyKey, parsed.data.idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      return {
        kind: "existing" as const,
        matches:
          existing.task === parsed.data.task &&
          existing.purpose === parsed.data.purpose &&
          existing.category === normalizedScope.category &&
          existing.providerId === normalizedScope.providerId &&
          existing.offerReference === parsed.data.offerReference &&
          existing.amountMinor === amountMinor,
        record: existing,
      };
    }

    const [policyRecord] = await transaction
      .select()
      .from(projectSpendingPolicy)
      .where(eq(projectSpendingPolicy.projectId, projectId))
      .limit(1);
    if (!policyRecord) {
      return { kind: "denied" as const, error: "A project spending policy is required." };
    }
    const policy = {
      ...policyRecord,
      allowedCategories: decodeList(policyRecord.allowedCategories),
      allowedProviders: decodeList(policyRecord.allowedProviders),
    };

    const reservations = (await transaction
      .select({
        amountMinor: purchaseApproval.amountMinor,
        expiresAt: purchaseApproval.expiresAt,
      })
      .from(purchaseApproval)
      .where(
        and(
          eq(purchaseApproval.projectId, projectId),
          inArray(purchaseApproval.status, ["pending", "approved"]),
          eq(purchaseApproval.policyVersion, policy.version),
        ),
      ))
      .filter((record) => record.expiresAt.getTime() > now.getTime());
    const reservedMinor = reservations
      .reduce((sum, record) => sum + BigInt(record.amountMinor), BigInt(0))
      .toString();
    const contributionRows = await transaction
      .select({
        amountMinor: contribution.amountMinor,
        currency: contribution.currency,
        externalReference: contribution.externalReference,
        receivedAmountMinor: contribution.receivedAmountMinor,
        refundedAmountMinor: contribution.refundedAmountMinor,
        source: contribution.source,
        status: contribution.status,
        verificationEvidence: contribution.verificationEvidence,
        verifiedAt: contribution.verifiedAt,
        refundEvidence: contribution.refundEvidence,
        refundedAt: contribution.refundedAt,
      })
      .from(contribution)
      .where(eq(contribution.projectId, projectId));
    const verifiedMinor = summarizeContributions(contributionRows).verifiedAmountMinor;
    const decision = authorizePurchaseRequest(
      policy,
      normalizedScope,
      reservedMinor,
      verifiedMinor,
      now,
    );
    if (!decision.allowed) {
      return { kind: "denied" as const, error: decision.reason };
    }

    const approvalId = randomUUID();
    const expiresAt = new Date(
      Math.min(now.getTime() + 24 * 60 * 60 * 1000, policy.expiresAt.getTime()),
    );
    const record = {
      id: approvalId,
      projectId,
      requestorId: session.user.id,
      task: parsed.data.task,
      purpose: parsed.data.purpose,
      category: normalizedScope.category,
      providerId: normalizedScope.providerId,
      offerReference: parsed.data.offerReference,
      amountMinor,
      currency: "USD",
      status: "pending",
      idempotencyKey: parsed.data.idempotencyKey,
      policyVersion: policy.version,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };
    await transaction.insert(purchaseApproval).values(record);
    await transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: "purchase_approval.requested",
        entityType: "purchase_approval",
        entityId: approvalId,
        details: JSON.stringify({
          amountMinor,
          currency: "USD",
          category: normalizedScope.category,
          providerId: normalizedScope.providerId,
          policyVersion: policy.version,
        }),
        createdAt: now,
      });
    return { kind: "created" as const, record };
  });

  if (result.kind === "denied") {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  if (result.kind === "existing" && !result.matches) {
    return NextResponse.json(
      { error: "This idempotency key was already used with a different purchase scope." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      approval: {
        id: result.record.id,
        amountMinor: result.record.amountMinor,
        currency: result.record.currency,
        status: result.record.status,
        expiresAt: result.record.expiresAt.toISOString(),
        policyVersion: result.record.policyVersion,
      },
      requiresHumanApproval: true,
      paymentExecuted: false,
      message: "Approval requests never execute or transfer payment.",
    },
    { status: result.kind === "created" ? 201 : 200 },
  );
}
