import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { project } from "@/lib/db/schema";
import {
  AiPlannerProviderError,
  getNearAiPlanner,
} from "@/lib/near-ai-planner";
import { getProjectRole } from "@/lib/project-queries";
import { canManageProject } from "@/lib/project-access";
import { validateProposedPlan } from "@/lib/ai-planning";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { projectId } = await params;
  const role = await getProjectRole(projectId, session.user.id);
  if (!canManageProject(role)) {
    return NextResponse.json(
      { error: "Project administrator access required." },
      { status: role ? 403 : 404 },
    );
  }

  const planner = getNearAiPlanner();
  if (!planner) {
    return NextResponse.json(
      { error: "AI planning is unavailable until a server-side provider is configured." },
      { status: 503 },
    );
  }

  const [projectRecord] = await db
    .select({
      objective: project.objective,
      expectedOutcome: project.expectedOutcome,
      targetAmountMinor: project.targetAmountMinor,
      status: project.status,
    })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  if (!projectRecord) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (projectRecord.status !== "active") {
    return NextResponse.json(
      { error: "Plans can only be generated for active projects." },
      { status: 409 },
    );
  }

  try {
    const output = await planner.generatePlan({
      objective: projectRecord.objective,
      expectedOutcome: projectRecord.expectedOutcome,
      targetAmountMinor: projectRecord.targetAmountMinor,
    });
    const result = validateProposedPlan(
      output,
      projectRecord.targetAmountMinor,
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      plan: result.data,
      totalEstimatedMinor: result.totalEstimatedMinor,
    });
  } catch (error) {
    if (error instanceof AiPlannerProviderError) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 },
      );
    }
    throw error;
  }
}
