import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityEvent,
  project,
  projectMember,
  projectSpendingPolicy,
  purchaseApproval,
} from "@/lib/db/schema";
import { canManageProject } from "@/lib/project-access";
import { parseUsdToMinorUnits } from "@/lib/money";
import { spendingPolicySchema } from "@/lib/spending-input";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = { params: Promise<{ projectId: string }> };

function policyResponse(record: typeof projectSpendingPolicy.$inferSelect | undefined) {
  if (!record) return null;
  return {
    perTransactionCapMinor: record.perTransactionCapMinor,
    totalAuthorizedCapMinor: record.totalAuthorizedCapMinor,
    allowedCategories: JSON.parse(record.allowedCategories) as string[],
    allowedProviders: JSON.parse(record.allowedProviders) as string[],
    agentExecutionAllowed: record.agentExecutionAllowed,
    version: record.version,
    expiresAt: record.expiresAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
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

  const [record] = await db
    .select()
    .from(projectSpendingPolicy)
    .where(eq(projectSpendingPolicy.projectId, projectId))
    .limit(1);
  return NextResponse.json({ policy: policyResponse(record) });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { projectId } = await params;
  const [membership] = await db
    .select({ role: projectMember.role, status: project.status })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, session.user.id)))
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!canManageProject(membership.role)) {
    return NextResponse.json({ error: "Project administrator access required." }, { status: 403 });
  }
  if (membership.status !== "active") {
    return NextResponse.json({ error: "Policies can only change on active projects." }, { status: 409 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = spendingPolicySchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Spending policy is invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const perTransactionCapMinor = parseUsdToMinorUnits(parsed.data.perTransactionCap);
  const totalAuthorizedCapMinor = parseUsdToMinorUnits(parsed.data.totalAuthorizedCap);
  if (
    !perTransactionCapMinor ||
    !totalAuthorizedCapMinor ||
    BigInt(perTransactionCapMinor) > BigInt(totalAuthorizedCapMinor)
  ) {
    return NextResponse.json(
      { error: "The per-transaction cap cannot exceed the total authorization cap." },
      { status: 400 },
    );
  }

  const allowedCategories = [...new Set(
    parsed.data.allowedCategories.map((value) => value.toLowerCase()),
  )];
  const allowedProviders = [...new Set(
    parsed.data.allowedProviders.map((value) => value.toLowerCase()),
  )];
  if (
    allowedCategories.length !== parsed.data.allowedCategories.length ||
    allowedProviders.length !== parsed.data.allowedProviders.length
  ) {
    return NextResponse.json(
      { error: "Policy categories and providers must be unique." },
      { status: 400 },
    );
  }

  const now = new Date();
  const result = await db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(projectSpendingPolicy)
      .where(eq(projectSpendingPolicy.projectId, projectId))
      .limit(1);
    const version = (existing?.version ?? 0) + 1;
    const expiresAt = new Date(
      now.getTime() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000,
    );
    const policy = {
      projectId,
      perTransactionCapMinor,
      totalAuthorizedCapMinor,
      allowedCategories: JSON.stringify(allowedCategories),
      allowedProviders: JSON.stringify(allowedProviders),
      agentExecutionAllowed: false,
      version,
      expiresAt,
      updatedBy: session.user.id,
      updatedAt: now,
    };

    if (existing) {
      await transaction
        .update(projectSpendingPolicy)
        .set(policy)
        .where(eq(projectSpendingPolicy.projectId, projectId));
    } else {
      await transaction.insert(projectSpendingPolicy).values(policy);
    }

    await transaction
      .update(purchaseApproval)
      .set({ status: "revoked", updatedAt: now })
      .where(
        and(
          eq(purchaseApproval.projectId, projectId),
          inArray(purchaseApproval.status, ["pending", "approved"]),
        ),
      );
    await transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: "spending_policy.updated",
        entityType: "spending_policy",
        entityId: projectId,
        details: JSON.stringify({ version, expiresAt: expiresAt.toISOString() }),
        createdAt: now,
      });

    return policy;
  });

  return NextResponse.json({ policy: policyResponse(result) });
}
