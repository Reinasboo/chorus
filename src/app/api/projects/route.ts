import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityEvent, project, projectMember } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { parseUsdToMinorUnits } from "@/lib/money";
import { createProjectSchema } from "@/lib/project-input";
import { readJsonBody } from "@/lib/request-json";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const projects = await db
    .select({
      id: project.id,
      name: project.name,
      objective: project.objective,
      targetAmountMinor: project.targetAmountMinor,
      currency: project.currency,
      status: project.status,
      role: projectMember.role,
      createdAt: project.createdAt,
    })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(eq(projectMember.userId, session.user.id))
    .orderBy(desc(project.updatedAt));

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Project details are invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date();
  const projectId = randomUUID();
  const amountMinor = parseUsdToMinorUnits(parsed.data.targetAmount);
  if (!amountMinor) {
    return NextResponse.json({ error: "Project budget is invalid." }, { status: 400 });
  }

  await db.transaction(async (transaction) => {
    await transaction.insert(project).values({
      id: projectId,
      name: parsed.data.name,
      objective: parsed.data.objective,
      expectedOutcome: parsed.data.expectedOutcome || null,
      targetAmountMinor: amountMinor,
      currency: "USD",
      status: "active",
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    });

    await transaction.insert(projectMember).values({
      projectId,
      userId: session.user.id,
      role: "owner",
      joinedAt: now,
    });

    await transaction.insert(activityEvent).values({
      id: randomUUID(),
      projectId,
      actorId: session.user.id,
      action: "project.created",
      entityType: "project",
      entityId: projectId,
      details: JSON.stringify({ name: parsed.data.name }),
      createdAt: now,
    });
  });

  return NextResponse.json({ id: projectId }, { status: 201 });
}
