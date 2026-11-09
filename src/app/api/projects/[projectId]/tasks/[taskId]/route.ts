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
import { updateProjectTaskSchema } from "@/lib/project-task-input";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = { params: Promise<{ projectId: string; taskId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = updateProjectTaskSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Task update is invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { projectId, taskId } = await params;
  const now = new Date();
  const result = db.transaction((transaction) => {
    const [membership] = transaction
      .select({
        status: project.status,
        taskId: projectTask.id,
        taskStatus: projectTask.status,
        reportedOutcome: projectTask.reportedOutcome,
      })
      .from(projectMember)
      .innerJoin(project, eq(project.id, projectMember.projectId))
      .innerJoin(
        projectTask,
        and(
          eq(projectTask.projectId, project.id),
          eq(projectTask.id, taskId),
        ),
      )
      .where(
        and(
          eq(projectMember.projectId, projectId),
          eq(projectMember.userId, session.user.id),
        ),
      )
      .limit(1)
      .all();

    if (!membership) return { kind: "not_found" as const };
    if (membership.status !== "active") return { kind: "inactive" as const };

    const reportedOutcome =
      parsed.data.reportedOutcome === undefined
        ? membership.reportedOutcome
        : parsed.data.reportedOutcome || null;
    if (parsed.data.status === "completed" && (reportedOutcome?.trim().length ?? 0) < 10) {
      return { kind: "outcome_required" as const };
    }

    transaction
      .update(projectTask)
      .set({
        status: parsed.data.status,
        reportedOutcome,
        updatedBy: session.user.id,
        updatedAt: now,
      })
      .where(
        and(eq(projectTask.id, taskId), eq(projectTask.projectId, projectId)),
      )
      .run();
    transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action:
          parsed.data.status === "completed"
            ? "task.completed"
            : "task.updated",
        entityType: "task",
        entityId: taskId,
        details: JSON.stringify({
          previousStatus: membership.taskStatus,
          status: parsed.data.status,
          reportedOutcomeChanged:
            parsed.data.reportedOutcome !== undefined &&
            parsed.data.reportedOutcome !== membership.reportedOutcome,
        }),
        createdAt: now,
      })
      .run();
    return { kind: "updated" as const, reportedOutcome };
  });

  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Project task not found." }, { status: 404 });
  }
  if (result.kind === "inactive") {
    return NextResponse.json({ error: "Tasks can only be updated in active projects." }, { status: 409 });
  }
  if (result.kind === "outcome_required") {
    return NextResponse.json(
      { error: "Add at least 10 characters describing the reported outcome before completing this task." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    task: {
      id: taskId,
      status: parsed.data.status,
      reportedOutcome: result.reportedOutcome,
      updatedAt: now.toISOString(),
      updatedByName: session.user.name,
    },
  });
}
