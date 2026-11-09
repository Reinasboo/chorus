import { z } from "zod";
import { parseUsdToMinorUnits } from "@/lib/money";

export const nearAccountIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^(?:[a-f0-9]{64}|[a-z0-9]+(?:[._-][a-z0-9]+)*)$/);

export const nearTreasuryChallengeSchema = z.object({
  accountId: nearAccountIdSchema,
});

export const nearTreasuryVerificationSchema = z.object({
  challengeId: z.uuid(),
  accountId: nearAccountIdSchema,
  publicKey: z.string().regex(/^(?:ed25519|secp256k1):[1-9A-HJ-NP-Za-km-z]+$/),
  signature: z.string().min(80).max(500),
});

export const nearIntentContributionSchema = z.object({
  amount: z.string().trim().refine(
    (value) => parseUsdToMinorUnits(value) !== null,
    "Enter a positive USD amount with up to two decimal places.",
  ),
  payerAccount: nearAccountIdSchema,
  idempotencyKey: z.uuid(),
});

export const nearIntentDepositSchema = z.object({
  transactionHash: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,64}$/),
});
