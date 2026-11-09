import { z } from "zod";
import { parseUsdToMinorUnits } from "@/lib/money";

export const reportContributionSchema = z.object({
  amount: z.string().trim().refine(
    (value) => parseUsdToMinorUnits(value) !== null,
    "Enter a positive USD amount with up to two decimal places.",
  ),
  idempotencyKey: z.uuid(),
  note: z.string().trim().max(500).optional().default(""),
});
