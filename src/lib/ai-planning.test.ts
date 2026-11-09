import { describe, expect, it } from "vitest";
import { validateProposedPlan } from "./ai-planning";

const plan = {
  summary: "Prepare a small community art campaign.",
  tasks: [
    {
      title: "Create campaign assets",
      description: "Design a set of reusable campaign graphics.",
      category: "design",
      estimatedCost: "20.00",
    },
  ],
};

describe("validateProposedPlan", () => {
  it("accepts structured plans within the project target", () => {
    expect(validateProposedPlan(plan, "2500")).toMatchObject({
      success: true,
      totalEstimatedMinor: "2000",
    });
  });

  it("rejects malformed or over-budget model output", () => {
    expect(
      validateProposedPlan({ ...plan, tasks: [{ ...plan.tasks[0], estimatedCost: "0" }] }, "2500"),
    ).toMatchObject({ success: false });
    expect(validateProposedPlan(plan, "1999")).toMatchObject({
      success: false,
      error: "The proposed plan exceeds the project target budget.",
    });
  });
});
