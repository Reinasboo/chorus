import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageProject } from "@/lib/project-access";
import { db } from "@/lib/db";
import { activityEvent, invitation } from "@/lib/db/schema";
import { getProjectRole } from "@/lib/project-queries";

type RouteContext = {
  params: Promise<{ projectId: string; invitationId: string }>;
};

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { projectId, invitationId } = await params;
  const role = await getProjectRole(projectId, session.user.id);
  if (!canManageProject(role)) {
    return NextResponse.json({ error: "Project administrator access required." }, { status: 403 });
  }

  const now = new Date();
  const updated = await db
    .update(invitation)
    .set({ revokedAt: now })
    .where(
      and(
        eq(invitation.id, invitationId),
        eq(invitation.projectId, projectId),
        isNull(invitation.acceptedAt),
        isNull(invitation.revokedAt),
      ),
    )
    .returning({ id: invitation.id });

  if (!updated.length) {
    return NextResponse.json(
      { error: "Invitation is unavailable or has already been accepted." },
      { status: 404 },
    );
  }

  await db.insert(activityEvent).values({
    id: randomUUID(),
    projectId,
    actorId: session.user.id,
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: invitationId,
    details: JSON.stringify({}),
    createdAt: now,
  });

  return NextResponse.json({ id: invitationId, revokedAt: now });
}
