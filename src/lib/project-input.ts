import { z } from "zod";
import { parseUsdToMinorUnits } from "@/lib/money";

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  objective: z.string().trim().min(10).max(2000),
  expectedOutcome: z.string().trim().max(1000).optional().default(""),
  targetAmount: z
    .string()
    .trim()
    .refine((value) => parseUsdToMinorUnits(value) !== null, {
      message: "Enter a positive USD amount with up to two decimal places.",
    }),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(["active", "completed", "archived"]).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one field to update.",
});

export const createInvitationSchema = z.object({
  role: z.enum(["administrator", "contributor"]).default("contributor"),
});
