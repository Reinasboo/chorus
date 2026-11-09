export const PROJECT_ROLES = ["owner", "administrator", "contributor"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export function canManageProject(
  role: string | null | undefined,
): role is "owner" | "administrator" {
  return role === "owner" || role === "administrator";
}

export function canInviteRole(
  actorRole: string | null | undefined,
  invitedRole: ProjectRole,
): boolean {
  if (!canManageProject(actorRole) || invitedRole === "owner") return false;
  if (invitedRole === "administrator") return actorRole === "owner";
  return true;
}

export function canTransitionProjectStatus(
  current: string,
  next: string,
): boolean {
  if (current === next) return true;
  return current === "active" && (next === "completed" || next === "archived");
}
