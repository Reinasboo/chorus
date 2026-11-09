import { z } from "zod";
import { parseUsdToMinorUnits } from "./money";

const proposedTaskSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1000),
  category: z.string().trim().min(2).max(80),
  estimatedCost: z.string().trim().refine(
    (value) => parseUsdToMinorUnits(value) !== null,
    "Task estimate must be a positive USD amount.",
  ),
});

export const proposedPlanSchema = z.object({
  summary: z.string().trim().min(10).max(1000),
  tasks: z.array(proposedTaskSchema).min(1).max(12),
});

export type AiPlannerProvider = {
  generatePlan(input: {
    objective: string;
    expectedOutcome: string | null;
    targetAmountMinor: string;
  }): Promise<unknown>;
};

export function validateProposedPlan(
  output: unknown,
  targetAmountMinor: string,
) {
  const parsed = proposedPlanSchema.safeParse(output);
  if (!parsed.success) {
    return {
      success: false as const,
      error: "The AI plan did not match the required task format.",
    };
  }

  const target = BigInt(targetAmountMinor);
  const total = parsed.data.tasks.reduce((sum, task) => {
    const amount = parseUsdToMinorUnits(task.estimatedCost);
    if (!amount) throw new Error("Validated task estimate became invalid.");
    return sum + BigInt(amount);
  }, BigInt(0));
  if (total > target) {
    return {
      success: false as const,
      error: "The proposed plan exceeds the project target budget.",
    };
  }

  return {
    success: true as const,
    data: parsed.data,
    totalEstimatedMinor: total.toString(),
  };
}
