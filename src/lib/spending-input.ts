import { z } from "zod";
import { parseUsdToMinorUnits } from "@/lib/money";

const providerOrCategory = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

const usdAmount = z.string().trim().refine(
  (value) => parseUsdToMinorUnits(value) !== null,
  "Enter a positive USD amount with up to two decimal places.",
);

export const spendingPolicySchema = z.object({
  perTransactionCap: usdAmount,
  totalAuthorizedCap: usdAmount,
  allowedCategories: z.array(providerOrCategory).min(1).max(20),
  allowedProviders: z.array(providerOrCategory).min(1).max(20),
  expiresInDays: z.number().int().min(1).max(90),
});

export const purchaseApprovalRequestSchema = z.object({
  task: z.string().trim().min(2).max(120),
  purpose: z.string().trim().min(10).max(1000),
  category: providerOrCategory,
  providerId: providerOrCategory,
  offerReference: z.string().trim().min(2).max(128),
  amount: usdAmount,
  idempotencyKey: z.uuid(),
});

export const purchaseApprovalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});
