import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activityEvent,
  contribution,
  invitation,
  nearIntentPayment,
  project,
  projectMember,
  projectSpendingPolicy,
  projectTask,
  purchaseApproval,
  user,
} from "@/lib/db/schema";
import { summarizeContributions } from "@/lib/contribution-ledger";
import { summarizeBudget } from "@/lib/budget-summary";

export async function listProjectsForUser(userId: string) {
  return db
    .select({
      id: project.id,
      name: project.name,
      objective: project.objective,
      targetAmountMinor: project.targetAmountMinor,
      currency: project.currency,
      status: project.status,
      nearTreasuryAccount: project.nearTreasuryAccount,
      nearTreasuryVerifiedAt: project.nearTreasuryVerifiedAt,
      createdBy: project.createdBy,
      role: projectMember.role,
      createdAt: project.createdAt,
    })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(eq(projectMember.userId, userId))
    .orderBy(desc(project.updatedAt));
}

export async function getDashboardData(userId: string) {
  const projects = await listProjectsForUser(userId);
  if (!projects.length) {
    return {
      projects: [],
      summary: {
        activeProjects: 0,
        verifiedAmountMinor: "0",
        reportedAmountMinor: "0",
        pendingApprovals: 0,
        reservedAmountMinor: "0",
        unreservedVerifiedAmountMinor: "0",
      },
      activity: [],
    };
  }

  const projectIds = projects.map((item) => item.id);
  const contributionRows = await db
    .select({
      projectId: contribution.projectId,
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
    .where(inArray(contribution.projectId, projectIds));
  const members = await db
    .select({ projectId: projectMember.projectId })
    .from(projectMember)
    .where(inArray(projectMember.projectId, projectIds));
  const pendingApprovals = await db
    .select({
      id: purchaseApproval.id,
      projectId: purchaseApproval.projectId,
      amountMinor: purchaseApproval.amountMinor,
      status: purchaseApproval.status,
      policyVersion: purchaseApproval.policyVersion,
      expiresAt: purchaseApproval.expiresAt,
    })
    .from(purchaseApproval)
    .where(
      and(
        inArray(purchaseApproval.projectId, projectIds),
        inArray(purchaseApproval.status, ["pending", "approved"]),
      ),
    );
  const policies = await db
    .select({
      projectId: projectSpendingPolicy.projectId,
      version: projectSpendingPolicy.version,
    })
    .from(projectSpendingPolicy)
    .where(inArray(projectSpendingPolicy.projectId, projectIds));
  const activity = await db
    .select({
      id: activityEvent.id,
      projectId: activityEvent.projectId,
      projectName: project.name,
      actorName: user.name,
      action: activityEvent.action,
      details: activityEvent.details,
      createdAt: activityEvent.createdAt,
    })
    .from(activityEvent)
    .innerJoin(project, eq(project.id, activityEvent.projectId))
    .leftJoin(user, eq(user.id, activityEvent.actorId))
    .where(inArray(activityEvent.projectId, projectIds))
    .orderBy(desc(activityEvent.createdAt))
    .limit(8);

  const rowsByProject = new Map<string, typeof contributionRows>();
  for (const row of contributionRows) {
    const rows = rowsByProject.get(row.projectId) ?? [];
    rows.push(row);
    rowsByProject.set(row.projectId, rows);
  }
  const memberCountByProject = new Map<string, number>();
  for (const member of members) {
    memberCountByProject.set(
      member.projectId,
      (memberCountByProject.get(member.projectId) ?? 0) + 1,
    );
  }
  const pendingApprovalCountByProject = new Map<string, number>();
  const policyVersionByProject = new Map(
    policies.map((policy) => [policy.projectId, policy.version]),
  );
  const reservedAmountByProject = new Map<string, bigint>();
  let pendingApprovalTotal = 0;
  const now = new Date();
  for (const approval of pendingApprovals) {
    const activeForCurrentPolicy =
      approval.expiresAt.getTime() > now.getTime() &&
      approval.policyVersion === policyVersionByProject.get(approval.projectId);
    if (approval.status === "pending" && activeForCurrentPolicy) {
      pendingApprovalTotal += 1;
      pendingApprovalCountByProject.set(
        approval.projectId,
        (pendingApprovalCountByProject.get(approval.projectId) ?? 0) + 1,
      );
    }
    if (activeForCurrentPolicy) {
      reservedAmountByProject.set(
        approval.projectId,
        (reservedAmountByProject.get(approval.projectId) ?? BigInt(0)) +
          BigInt(approval.amountMinor),
      );
    }
  }

  let verifiedAmount = BigInt(0);
  let reportedAmount = BigInt(0);
  let reservedAmount = BigInt(0);
  const enrichedProjects = projects.map((item) => {
    const summary = summarizeContributions(rowsByProject.get(item.id) ?? []);
    verifiedAmount += BigInt(summary.verifiedAmountMinor);
    reportedAmount += BigInt(summary.reportedAmountMinor);
    const reservationMinor = (
      reservedAmountByProject.get(item.id) ?? BigInt(0)
    ).toString();
    const budget = summarizeBudget(
      summary.verifiedAmountMinor,
      reservationMinor,
    );
    reservedAmount += BigInt(budget.reservedAmountMinor);
    const { createdBy, ...projectDetails } = item;
    return {
      ...projectDetails,
      verifiedAmountMinor: summary.verifiedAmountMinor,
      reportedAmountMinor: summary.reportedAmountMinor,
      reservedAmountMinor: budget.reservedAmountMinor,
      unreservedVerifiedAmountMinor: budget.unreservedVerifiedAmountMinor,
      memberCount: memberCountByProject.get(item.id) ?? 0,
      pendingApprovalCount: pendingApprovalCountByProject.get(item.id) ?? 0,
      isOwned: createdBy === userId,
    };
  });

  return {
    projects: enrichedProjects,
    summary: {
      activeProjects: projects.filter((item) => item.status === "active").length,
      verifiedAmountMinor: verifiedAmount.toString(),
      reportedAmountMinor: reportedAmount.toString(),
      pendingApprovals: pendingApprovalTotal,
      reservedAmountMinor: reservedAmount.toString(),
      unreservedVerifiedAmountMinor: summarizeBudget(
        verifiedAmount.toString(),
        reservedAmount.toString(),
      ).unreservedVerifiedAmountMinor,
    },
    activity: activity.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function getActivityLedgerForUser(userId: string) {
  const asOf = Date.now();
  const projects = await listProjectsForUser(userId);
  if (!projects.length) return { projects: [], events: [], asOf };

  const events = await db
    .select({
      id: activityEvent.id,
      projectId: activityEvent.projectId,
      projectName: project.name,
      actorId: activityEvent.actorId,
      actorName: user.name,
      action: activityEvent.action,
      entityType: activityEvent.entityType,
      createdAt: activityEvent.createdAt,
    })
    .from(activityEvent)
    .innerJoin(project, eq(project.id, activityEvent.projectId))
    .leftJoin(user, eq(user.id, activityEvent.actorId))
    .where(inArray(activityEvent.projectId, projects.map((item) => item.id)))
    .orderBy(desc(activityEvent.createdAt))
    .limit(250);

  return {
    projects: projects.map(({ id, name }) => ({ id, name })),
    asOf,
    events: events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function getProjectForMember(projectId: string, userId: string) {
  const [record] = await db
    .select({
      id: project.id,
      name: project.name,
      objective: project.objective,
      expectedOutcome: project.expectedOutcome,
      targetAmountMinor: project.targetAmountMinor,
      currency: project.currency,
      status: project.status,
      nearTreasuryAccount: project.nearTreasuryAccount,
      nearTreasuryVerifiedAt: project.nearTreasuryVerifiedAt,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      role: projectMember.role,
    })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(and(eq(project.id, projectId), eq(projectMember.userId, userId)))
    .limit(1);

  if (!record) return null;

  const members = await db
    .select({
      userId: projectMember.userId,
      name: user.name,
      email: user.email,
      role: projectMember.role,
      joinedAt: projectMember.joinedAt,
    })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(eq(projectMember.projectId, projectId))
    .orderBy(projectMember.joinedAt);

  const events = await db
    .select({
      id: activityEvent.id,
      actorId: activityEvent.actorId,
      action: activityEvent.action,
      entityType: activityEvent.entityType,
      entityId: activityEvent.entityId,
      details: activityEvent.details,
      createdAt: activityEvent.createdAt,
      actorName: user.name,
    })
    .from(activityEvent)
    .leftJoin(user, eq(user.id, activityEvent.actorId))
    .where(eq(activityEvent.projectId, projectId))
    .orderBy(desc(activityEvent.createdAt))
    .limit(30);

  return { ...record, members, events };
}

export async function getProjectRole(projectId: string, userId: string) {
  const [membership] = await db
    .select({ role: projectMember.role })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, userId),
      ),
    )
    .limit(1);

  return membership?.role ?? null;
}

export async function getProjectTasks(projectId: string) {
  const records = await db
    .select({
      id: projectTask.id,
      title: projectTask.title,
      description: projectTask.description,
      category: projectTask.category,
      estimatedCostMinor: projectTask.estimatedCostMinor,
      status: projectTask.status,
      reportedOutcome: projectTask.reportedOutcome,
      createdByName: user.name,
      createdAt: projectTask.createdAt,
      updatedAt: projectTask.updatedAt,
    })
    .from(projectTask)
    .innerJoin(user, eq(user.id, projectTask.createdBy))
    .where(eq(projectTask.projectId, projectId))
    .orderBy(desc(projectTask.createdAt));

  return records.map((record) => ({
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }));
}

export async function listProjectInvitations(projectId: string) {
  const records = await db
    .select({
      id: invitation.id,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
    })
    .from(invitation)
    .where(eq(invitation.projectId, projectId))
    .orderBy(desc(invitation.createdAt));
  const now = Date.now();

  return records.map((record) => ({
    id: record.id,
    role: record.role,
    expiresAt: record.expiresAt.toISOString(),
    acceptedAt: record.acceptedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    active:
      !record.acceptedAt &&
      !record.revokedAt &&
      record.expiresAt.getTime() > now,
  }));
}

export async function getContributionLedger(projectId: string) {
  const [records, policy, approvals] = await Promise.all([
    db
    .select({
      id: contribution.id,
      contributorName: user.name,
      amountMinor: contribution.amountMinor,
      currency: contribution.currency,
      source: contribution.source,
      status: contribution.status,
      nearIntentStatus: nearIntentPayment.status,
      note: contribution.note,
      receivedAmountMinor: contribution.receivedAmountMinor,
      refundedAmountMinor: contribution.refundedAmountMinor,
      externalReference: contribution.externalReference,
      verificationEvidence: contribution.verificationEvidence,
      verifiedAt: contribution.verifiedAt,
      refundEvidence: contribution.refundEvidence,
      refundedAt: contribution.refundedAt,
      createdAt: contribution.createdAt,
    })
    .from(contribution)
    .innerJoin(user, eq(user.id, contribution.contributorId))
    .leftJoin(
      nearIntentPayment,
      eq(nearIntentPayment.contributionId, contribution.id),
    )
    .where(eq(contribution.projectId, projectId))
    .orderBy(desc(contribution.createdAt)),
    db
      .select({ version: projectSpendingPolicy.version })
      .from(projectSpendingPolicy)
      .where(eq(projectSpendingPolicy.projectId, projectId))
      .limit(1),
    db
      .select({
        amountMinor: purchaseApproval.amountMinor,
        status: purchaseApproval.status,
        policyVersion: purchaseApproval.policyVersion,
        expiresAt: purchaseApproval.expiresAt,
      })
      .from(purchaseApproval)
      .where(
        and(
          eq(purchaseApproval.projectId, projectId),
          inArray(purchaseApproval.status, ["pending", "approved"]),
        ),
      ),
  ]);

  const contributionSummary = summarizeContributions(records);
  const currentPolicyVersion = policy[0]?.version;
  const now = Date.now();
  const reservedAmountMinor = approvals
    .filter(
      (approval) =>
        currentPolicyVersion !== undefined &&
        approval.policyVersion === currentPolicyVersion &&
        approval.expiresAt.getTime() > now,
    )
    .reduce((sum, approval) => sum + BigInt(approval.amountMinor), BigInt(0))
    .toString();
  const summary = {
    ...contributionSummary,
    ...summarizeBudget(
      contributionSummary.verifiedAmountMinor,
      reservedAmountMinor,
    ),
    activeReservationCount: approvals.filter(
      (approval) =>
        currentPolicyVersion !== undefined &&
        approval.policyVersion === currentPolicyVersion &&
        approval.expiresAt.getTime() > now,
    ).length,
  };
  return {
    summary,
    contributions: records.slice(0, 100).map((record) => ({
      id: record.id,
      contributorName: record.contributorName,
      amountMinor: record.amountMinor,
      currency: record.currency,
      source: record.source,
      status: record.status,
      nearIntentStatus: record.nearIntentStatus,
      note: record.note,
      verifiedAt: record.verifiedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    })),
  };
}
