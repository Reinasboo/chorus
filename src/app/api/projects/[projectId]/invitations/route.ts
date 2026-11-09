import { createHash, randomBytes, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canInviteRole, canManageProject, type ProjectRole } from "@/lib/project-access";
import { createInvitationSchema } from "@/lib/project-input";
import { db } from "@/lib/db";
import { activityEvent, invitation, project } from "@/lib/db/schema";
import { getProjectRole } from "@/lib/project-queries";
import { readJsonBody } from "@/lib/request-json";

type RouteContext = { params: Promise<{ projectId: string }> };
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { projectId } = await params;
  const role = await getProjectRole(projectId, session.user.id);
  if (!canManageProject(role)) {
    return NextResponse.json({ error: "Project administrator access required." }, { status: 403 });
  }

  const invitations = await db
    .select({
      id: invitation.id,
      role: invitation.role,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
    })
    .from(invitation)
    .where(eq(invitation.projectId, projectId))
    .orderBy(desc(invitation.createdAt));

  return NextResponse.json(invitations);
}

export async function POST(request: Request, { params }: RouteContext) {
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
  const parsed = createInvitationSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invitation details are invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const inviteRole: ProjectRole = parsed.data.role;
  if (!canInviteRole(role, inviteRole)) {
    return NextResponse.json({ error: "You cannot invite that role." }, { status: 403 });
  }

  const [projectRecord] = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  if (!projectRecord) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitationId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS);

  await db.transaction((transaction) => {
    transaction
      .insert(invitation)
      .values({
        id: invitationId,
        projectId,
        tokenHash,
        role: inviteRole,
        expiresAt,
        createdBy: session.user.id,
        createdAt: now,
      })
      .run();
    transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId,
        actorId: session.user.id,
        action: "invitation.created",
        entityType: "invitation",
        entityId: invitationId,
        details: JSON.stringify({ role: inviteRole, expiresAt }),
        createdAt: now,
      })
      .run();
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json(
    {
      id: invitationId,
      role: inviteRole,
      expiresAt,
      url: `${baseUrl}/invite/${token}`,
    },
    { status: 201 },
  );
}
