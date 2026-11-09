import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activityEvent, project } from "@/lib/db/schema";
import { getProjectForMember, getProjectRole } from "@/lib/project-queries";
import {
  canManageProject,
  canTransitionProjectStatus,
} from "@/lib/project-access";
import { parseUsdToMinorUnits } from "@/lib/money";
import { updateProjectSchema } from "@/lib/project-input";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { projectId } = await params;
  const record = await getProjectForMember(projectId, session.user.id);
  if (!record) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { projectId } = await params;
  const role = await getProjectRole(projectId, session.user.id);
  if (!canManageProject(role)) {
    return NextResponse.json({ error: "Project administrator access required." }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = updateProjectSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Project details are invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (parsed.data.status && role !== "owner") {
    return NextResponse.json({ error: "Only the owner can change project status." }, { status: 403 });
  }

  const [existing] = await db
    .select({ id: project.id, status: project.status })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (
    parsed.data.status &&
    !canTransitionProjectStatus(existing.status, parsed.data.status)
  ) {
    return NextResponse.json(
      { error: "Completed or archived projects cannot be reopened." },
      { status: 409 },
    );
  }

  const update: Partial<typeof project.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.objective !== undefined) update.objective = parsed.data.objective;
  if (parsed.data.expectedOutcome !== undefined) {
    update.expectedOutcome = parsed.data.expectedOutcome || null;
  }
  if (parsed.data.targetAmount !== undefined) {
    const amountMinor = parseUsdToMinorUnits(parsed.data.targetAmount);
    if (!amountMinor) {
      return NextResponse.json({ error: "Project budget is invalid." }, { status: 400 });
    }
    update.targetAmountMinor = amountMinor;
  }
  if (parsed.data.status !== undefined) update.status = parsed.data.status;

  const now = new Date();
  await db.transaction((transaction) => {
    transaction
      .update(project)
      .set(update)
      .where(eq(project.id, projectId))
      .run();
    transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: "project.updated",
        entityType: "project",
        entityId: projectId,
        details: JSON.stringify({ fields: Object.keys(parsed.data) }),
        createdAt: now,
      })
      .run();
  });

  return NextResponse.json({ id: projectId });
}
