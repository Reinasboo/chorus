import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityEvent,
  contribution,
  project,
  projectMember,
} from "@/lib/db/schema";
import { getContributionLedger } from "@/lib/project-queries";
import { parseUsdToMinorUnits } from "@/lib/money";
import { reportContributionSchema } from "@/lib/contribution-input";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { projectId } = await params;
  const [membership] = await db
    .select({ projectId: projectMember.projectId })
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

  return NextResponse.json(await getContributionLedger(projectId));
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { projectId } = await params;
  const [membership] = await db
    .select({ status: project.status })
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
      { error: "Contributions can only be reported for active projects." },
      { status: 409 },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  const parsed = reportContributionSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Contribution details are invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const amountMinor = parseUsdToMinorUnits(parsed.data.amount);
  if (!amountMinor) {
    return NextResponse.json(
      { error: "Contribution amount is invalid." },
      { status: 400 },
    );
  }

  const now = new Date();
  const contributionId = randomUUID();
  const result = db.transaction((transaction) => {
    const [existing] = transaction
      .select({
        id: contribution.id,
        amountMinor: contribution.amountMinor,
        note: contribution.note,
        status: contribution.status,
        source: contribution.source,
        createdAt: contribution.createdAt,
      })
      .from(contribution)
      .where(
        and(
          eq(contribution.projectId, projectId),
          eq(contribution.contributorId, session.user.id),
          eq(contribution.idempotencyKey, parsed.data.idempotencyKey),
        ),
      )
      .limit(1)
      .all();

    if (existing) {
      return {
        kind: "existing" as const,
        matches:
          existing.amountMinor === amountMinor &&
          existing.note === (parsed.data.note || null),
        record: existing,
      };
    }

    const record = {
      id: contributionId,
      amountMinor,
      note: parsed.data.note || null,
      status: "reported",
      source: "user_reported",
      createdAt: now,
    };
    transaction
      .insert(contribution)
      .values({
        ...record,
        projectId,
        contributorId: session.user.id,
        idempotencyKey: parsed.data.idempotencyKey,
        currency: "USD",
        refundedAmountMinor: "0",
        updatedAt: now,
      })
      .run();
    transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: "contribution.reported",
        entityType: "contribution",
        entityId: contributionId,
        details: JSON.stringify({
          amountMinor,
          currency: "USD",
          verification: "user_reported",
        }),
        createdAt: now,
      })
      .run();

    return { kind: "created" as const, matches: true, record };
  });

  if (!result.matches) {
    return NextResponse.json(
      {
        error:
          "This idempotency key was already used with different contribution details.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      contribution: {
        id: result.record.id,
        amountMinor: result.record.amountMinor,
        currency: "USD",
        status: result.record.status,
        source: result.record.source,
        createdAt: result.record.createdAt.toISOString(),
      },
      verified: false,
      idempotent: result.kind === "existing",
      message: "Reported only; no funds were transferred or verified.",
    },
    { status: result.kind === "created" ? 201 : 200 },
  );
}
