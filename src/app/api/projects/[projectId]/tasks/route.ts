import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityEvent,
  project,
  projectMember,
  projectTask,
} from "@/lib/db/schema";
import { canManageProject } from "@/lib/project-access";
import { createProjectTaskSchema } from "@/lib/project-task-input";
import { getProjectRole, getProjectTasks } from "@/lib/project-queries";
import { readJsonBody } from "@/lib/request-json";
import { parseUsdToMinorUnits } from "@/lib/money";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { projectId } = await params;
  if (!(await getProjectRole(projectId, session.user.id))) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ tasks: await getProjectTasks(projectId) });
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = createProjectTaskSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Task details are invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { projectId } = await params;
  const role = await getProjectRole(projectId, session.user.id);
  if (!canManageProject(role)) {
    return NextResponse.json(
      { error: "Project administrator access required to create tasks." },
      { status: role ? 403 : 404 },
    );
  }

  const now = new Date();
  const taskId = randomUUID();
  const estimatedCostMinor = parsed.data.estimatedCost
    ? parseUsdToMinorUnits(parsed.data.estimatedCost)
    : null;
  const result = await db.transaction(async (transaction) => {
    const [membership] = await transaction
      .select({ role: projectMember.role, status: project.status })
      .from(projectMember)
      .innerJoin(project, eq(project.id, projectMember.projectId))
      .where(
        and(
          eq(projectMember.projectId, projectId),
          eq(projectMember.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!membership || !canManageProject(membership.role)) {
      return { kind: "forbidden" as const };
    }
    if (membership.status !== "active") {
      return { kind: "inactive" as const };
    }

    await transaction
      .insert(projectTask)
      .values({
        id: taskId,
        projectId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category ?? null,
        estimatedCostMinor,
        status: "todo",
        reportedOutcome: null,
        createdBy: session.user.id,
        updatedBy: session.user.id,
        createdAt: now,
        updatedAt: now,
      });
    await transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: "task.created",
        entityType: "task",
        entityId: taskId,
        details: JSON.stringify({
          title: parsed.data.title,
          category: parsed.data.category ?? null,
          estimatedCostMinor,
        }),
        createdAt: now,
      });
    return { kind: "created" as const };
  });

  if (result.kind === "forbidden") {
    return NextResponse.json({ error: "Project administrator access required." }, { status: 403 });
  }
  if (result.kind === "inactive") {
    return NextResponse.json({ error: "Tasks can only be created for active projects." }, { status: 409 });
  }

  return NextResponse.json({
    task: {
      id: taskId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category ?? null,
      estimatedCostMinor,
      status: "todo",
      reportedOutcome: null,
      createdByName: session.user.name,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  }, { status: 201 });
}
