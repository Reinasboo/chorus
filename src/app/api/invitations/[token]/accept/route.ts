import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activityEvent, invitation, projectMember } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ token: string }> };
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: "Invitation is invalid or expired." }, { status: 404 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  const result = await db.transaction((transaction) => {
    const [record] = transaction
      .select({
        id: invitation.id,
        projectId: invitation.projectId,
        role: invitation.role,
      })
      .from(invitation)
      .where(
        and(
          eq(invitation.tokenHash, tokenHash),
          isNull(invitation.acceptedAt),
          isNull(invitation.revokedAt),
          gt(invitation.expiresAt, now),
        ),
      )
      .limit(1)
      .all();

    if (!record) return { error: "Invitation is invalid or expired." as const };

    const [membership] = transaction
      .select({ userId: projectMember.userId })
      .from(projectMember)
      .where(
        and(
          eq(projectMember.projectId, record.projectId),
          eq(projectMember.userId, session.user.id),
        ),
      )
      .limit(1)
      .all();

    if (membership) return { error: "You are already a project member." as const };

    const accepted = transaction
      .update(invitation)
      .set({ acceptedAt: now, acceptedBy: session.user.id })
      .where(
        and(
          eq(invitation.id, record.id),
          isNull(invitation.acceptedAt),
          isNull(invitation.revokedAt),
          gt(invitation.expiresAt, now),
        ),
      )
      .returning({ id: invitation.id })
      .get();

    if (!accepted) return { error: "Invitation is invalid or expired." as const };

    transaction
      .insert(projectMember)
      .values({
        projectId: record.projectId,
        userId: session.user.id,
        role: record.role,
        joinedAt: now,
      })
      .run();

    transaction
      .insert(activityEvent)
      .values({
        id: randomUUID(),
        projectId: record.projectId,
        actorId: session.user.id,
        action: "member.joined",
        entityType: "membership",
        entityId: session.user.id,
        details: JSON.stringify({ role: record.role }),
        createdAt: now,
      })
      .run();

    return { projectId: record.projectId };
  });

  if ("error" in result) {
    const status = result.error === "You are already a project member." ? 409 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ projectId: result.projectId });
}
