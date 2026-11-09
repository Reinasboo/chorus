import { describe, expect, it } from "vitest";
import {
  canInviteRole,
  canManageProject,
  canTransitionProjectStatus,
} from "./project-access";

describe("project role policy", () => {
  it("allows only owners and administrators to manage projects", () => {
    expect(canManageProject("owner")).toBe(true);
    expect(canManageProject("administrator")).toBe(true);
    expect(canManageProject("contributor")).toBe(false);
    expect(canManageProject(null)).toBe(false);
  });

  it("allows contributors from either manager and admins only from owners", () => {
    expect(canInviteRole("owner", "administrator")).toBe(true);
    expect(canInviteRole("administrator", "administrator")).toBe(false);
    expect(canInviteRole("administrator", "contributor")).toBe(true);
    expect(canInviteRole("contributor", "contributor")).toBe(false);
  });

  it("never permits creating another owner through an invitation", () => {
    expect(canInviteRole("owner", "owner")).toBe(false);
  });

  it("allows active projects to close but prevents reopening terminal projects", () => {
    expect(canTransitionProjectStatus("active", "completed")).toBe(true);
    expect(canTransitionProjectStatus("active", "archived")).toBe(true);
    expect(canTransitionProjectStatus("completed", "active")).toBe(false);
    expect(canTransitionProjectStatus("archived", "completed")).toBe(false);
    expect(canTransitionProjectStatus("active", "active")).toBe(true);
  });
});
