import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
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
} from "@/lib/db/schema";
import { canManageProject } from "@/lib/project-access";
import { summarizeContributions } from "@/lib/contribution-ledger";
import { purchaseApprovalDecisionSchema } from "@/lib/spending-input";
import { authorizePurchaseRequest } from "@/lib/spending-policy";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = {
  params: Promise<{ projectId: string; approvalId: string }>;
};

function decodeList(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Stored spending policy lists are invalid.");
  }
  return parsed;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { projectId, approvalId } = await params;
  const [membership] = await db
    .select({ role: projectMember.role, status: project.status })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, session.user.id)))
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Purchase approval not found." }, { status: 404 });
  }
  if (!canManageProject(membership.role)) {
    return NextResponse.json({ error: "Project approver access required." }, { status: 403 });
  }
  if (membership.status !== "active") {
    return NextResponse.json(
      { error: "Purchase requests can only be approved on active projects." },
      { status: 409 },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = purchaseApprovalDecisionSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "Approval decision is invalid." }, { status: 400 });
  }

  const now = new Date();
  const result = await db.transaction(async (transaction) => {
    const [currentProject] = await transaction
      .select({ status: project.status })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);
    if (currentProject?.status !== "active") {
      return {
        kind: "conflict" as const,
        error: "Purchase requests can only be approved on active projects.",
      };
    }

    const [approval] = await transaction
      .select()
      .from(purchaseApproval)
      .where(
        and(
          eq(purchaseApproval.id, approvalId),
          eq(purchaseApproval.projectId, projectId),
        ),
      )
      .limit(1);
    if (!approval) return { kind: "not_found" as const };
    if (approval.status !== "pending") {
      return { kind: "conflict" as const, error: "This purchase request is no longer pending." };
    }
    if (approval.expiresAt.getTime() <= now.getTime()) {
      await transaction
        .update(purchaseApproval)
        .set({ status: "expired", updatedAt: now })
        .where(eq(purchaseApproval.id, approvalId));
      return { kind: "conflict" as const, error: "This purchase request has expired." };
    }

    const [policyRecord] = await transaction
      .select()
      .from(projectSpendingPolicy)
      .where(eq(projectSpendingPolicy.projectId, projectId))
      .limit(1);
    if (
      !policyRecord ||
      policyRecord.version !== approval.policyVersion ||
      policyRecord.expiresAt.getTime() <= now.getTime()
    ) {
      await transaction
        .update(purchaseApproval)
        .set({ status: "revoked", updatedAt: now })
        .where(eq(purchaseApproval.id, approvalId));
      await transaction
        .insert(activityEvent)
        .values({
          id: randomUUID(),
          projectId,
          actorId: session.user.id,
          action: "purchase_approval.revoked",
          entityType: "purchase_approval",
          entityId: approvalId,
          details: JSON.stringify({ reason: "policy_changed_or_expired" }),
          createdAt: now,
        });
      return { kind: "conflict" as const, error: "The policy changed or expired; request a new approval." };
    }

    if (parsed.data.decision === "approved") {
      const policy = {
        ...policyRecord,
        allowedCategories: decodeList(policyRecord.allowedCategories),
        allowedProviders: decodeList(policyRecord.allowedProviders),
      };
      const reservations = (await transaction
        .select({
          id: purchaseApproval.id,
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
        .filter(
          (record) =>
            record.id !== approvalId &&
            record.expiresAt.getTime() > now.getTime(),
        );
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
        {
          amountMinor: approval.amountMinor,
          currency: approval.currency,
          category: approval.category,
          providerId: approval.providerId,
        },
        reservedMinor,
        verifiedMinor,
        now,
      );
      if (!decision.allowed) {
        return { kind: "conflict" as const, error: decision.reason };
      }
    }

    const nextStatus = parsed.data.decision;
    await transaction
      .update(purchaseApproval)
      .set({
        status: nextStatus,
        approverId: session.user.id,
        approvedAt: nextStatus === "approved" ? now : null,
        updatedAt: now,
      })
      .where(eq(purchaseApproval.id, approvalId));
    await transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: `purchase_approval.${nextStatus}`,
        entityType: "purchase_approval",
        entityId: approvalId,
        details: JSON.stringify({
          amountMinor: approval.amountMinor,
          currency: approval.currency,
          policyVersion: approval.policyVersion,
        }),
        createdAt: now,
      });
    return { kind: "updated" as const, status: nextStatus };
  });

  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Purchase approval not found." }, { status: 404 });
  }
  if (result.kind === "conflict") {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({
    status: result.status,
    paymentExecuted: false,
    executionEnabled: false,
    message: "Approval records scope only; payment execution is disabled.",
  });
}
