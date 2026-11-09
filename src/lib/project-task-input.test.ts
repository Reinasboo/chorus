import { describe, expect, it } from "vitest";
import {
  createProjectTaskSchema,
  updateProjectTaskSchema,
} from "./project-task-input";

describe("project task input", () => {
  it("trims and validates task titles and descriptions", () => {
    expect(
      createProjectTaskSchema.parse({
        title: "  Draft campaign  ",
        description: " Prepare the first campaign copy. ",
      }),
    ).toEqual({
      title: "Draft campaign",
      description: "Prepare the first campaign copy.",
    });
    expect(
      createProjectTaskSchema.safeParse({
        title: "x",
        description: "short",
      }).success,
    ).toBe(false);
  });

  it("accepts optional planning category and positive USD estimate", () => {
    expect(
      createProjectTaskSchema.parse({
        title: "  Design assets  ",
        description: " Create reusable campaign graphics. ",
        category: " design ",
        estimatedCost: "20.00",
      }),
    ).toEqual({
      title: "Design assets",
      description: "Create reusable campaign graphics.",
      category: "design",
      estimatedCost: "20.00",
    });
    expect(
      createProjectTaskSchema.safeParse({
        title: "Design assets",
        description: "Create reusable campaign graphics.",
        category: "x",
        estimatedCost: "0",
      }).success,
    ).toBe(false);
    expect(
      createProjectTaskSchema.safeParse({
        title: "Design assets",
        description: "Create reusable campaign graphics.",
        estimatedCost: "20.001",
      }).success,
    ).toBe(false);
  });

  it("requires a reported outcome to mark work completed", () => {
    expect(
      updateProjectTaskSchema.safeParse({
        status: "completed",
        reportedOutcome: "   ",
      }).success,
    ).toBe(false);
    expect(
      updateProjectTaskSchema.safeParse({
        status: "completed",
        reportedOutcome: "First draft delivered to the team.",
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported task statuses and oversized outcomes", () => {
    expect(
      updateProjectTaskSchema.safeParse({ status: "executing" }).success,
    ).toBe(false);
    expect(
      updateProjectTaskSchema.safeParse({
        status: "todo",
        reportedOutcome: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });
});
