import { z } from "zod";

export const projectTaskStatuses = [
  "todo",
  "in_progress",
  "blocked",
  "completed",
] as const;

export const createProjectTaskSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(2000),
});

export const updateProjectTaskSchema = z
  .object({
    status: z.enum(projectTaskStatuses),
    reportedOutcome: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "completed" && (value.reportedOutcome?.length ?? 0) < 10) {
      context.addIssue({
        code: "custom",
        path: ["reportedOutcome"],
        message: "Add at least 10 characters describing the reported outcome before completing this task.",
      });
    }
  });
