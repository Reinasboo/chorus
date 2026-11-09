import "server-only";

import { z } from "zod";
import {
  assertNearIntentQuoteMatches,
  usdMinorToUsdcAtomic,
} from "@/lib/near-intents-contract";

const apiBaseUrl = "https://1click.chaindefuser.com/v0";

const tokenSchema = z.object({
  assetId: z.string().min(1),
  decimals: z.number().int().positive(),
  blockchain: z.string().min(1),
  symbol: z.string().min(1),
  contractAddress: z.string().min(1),
});

const tokenListSchema = z.array(tokenSchema.passthrough());

const quoteResponseSchema = z.object({
  correlationId: z.string().min(1),
  quoteRequest: z.object({
    amount: z.string(),
    originAsset: z.string(),
    destinationAsset: z.string(),
    recipient: z.string(),
    refundTo: z.string(),
    swapType: z.string(),
  }).passthrough(),
  quote: z.object({
    depositAddress: z.string().min(1),
    amountIn: z.string().regex(/^[1-9]\d*$/),
    amountInFormatted: z.string().min(1),
    amountOut: z.string().regex(/^[1-9]\d*$/),
    amountOutFormatted: z.string().min(1),
    minAmountIn: z.string().regex(/^[1-9]\d*$/).optional(),
    maxAmountIn: z.string().regex(/^[1-9]\d*$/).optional(),
    deadline: z.string().datetime({ offset: true }),
  }).passthrough(),
}).passthrough();

export type NearIntentQuote = {
  correlationId: string;
  depositAddress: string;
  originAssetId: string;
  originTokenContract: string;
  destinationAssetId: string;
  destinationTokenContract: string;
  amountIn: string;
  amountInFormatted: string;
  minAmountIn: string | null;
  maxAmountIn: string | null;
  amountOut: string;
  amountOutFormatted: string;
  deadline: Date;
};

type Token = z.infer<typeof tokenSchema>;

let tokenCache: { expiresAt: number; tokens: Token[] } | null = null;

async function getTokens() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.tokens;

  const response = await fetch(`${apiBaseUrl}/tokens`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`NEAR Intents token discovery failed (${response.status}).`);
  }
  const result = tokenListSchema.safeParse(await response.json());
  if (!result.success) {
    throw new Error("NEAR Intents returned an invalid token list.");
  }

  tokenCache = { expiresAt: Date.now() + 5 * 60_000, tokens: result.data };
  return tokenCache.tokens;
}

function findNearToken(
  tokens: Token[],
  symbol: string,
  contractAddress: string,
) {
  const token = tokens.find(
    (candidate) =>
      candidate.blockchain === "near" &&
      candidate.symbol === symbol &&
      candidate.contractAddress === contractAddress &&
      candidate.assetId === `nep141:${candidate.contractAddress}`,
  );
  if (!token) {
    throw new Error(`NEAR Intents does not currently list the NEAR ${symbol} asset.`);
  }
  return token;
}

export async function createNearUsdcQuote({
  amountMinor,
  payerAccount,
  recipientAccount,
}: {
  amountMinor: string;
  payerAccount: string;
  recipientAccount: string;
}): Promise<NearIntentQuote> {
  const tokens = await getTokens();
  const origin = findNearToken(tokens, "wNEAR", "wrap.near");
  const destination = findNearToken(
    tokens,
    "USDC",
    "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  );
  if (origin.decimals !== 24 || destination.decimals !== 6) {
    throw new Error("NEAR Intents returned unexpected decimals for wNEAR or USDC.");
  }
  const amountOut = usdMinorToUsdcAtomic(amountMinor);
  const requestedDeadline = new Date(Date.now() + 9 * 60_000).toISOString();
  const request = {
    dry: false,
    swapType: "EXACT_OUTPUT",
    slippageTolerance: 100,
    originAsset: origin.assetId,
    destinationAsset: destination.assetId,
    depositType: "ORIGIN_CHAIN",
    recipient: recipientAccount,
    recipientType: "DESTINATION_CHAIN",
    refundTo: payerAccount,
    refundType: "ORIGIN_CHAIN",
    amount: amountOut,
    deadline: requestedDeadline,
  };
  const apiKey = process.env.NEAR_INTENTS_API_KEY;
  const response = await fetch(`${apiBaseUrl}/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    body: JSON.stringify(request),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`NEAR Intents quote failed (${response.status}).`);
  }
  const parsed = quoteResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("NEAR Intents returned an invalid quote.");
  }
  const deadline = assertNearIntentQuoteMatches(parsed.data, {
    amountOut,
    originAssetId: origin.assetId,
    destinationAssetId: destination.assetId,
    recipient: recipientAccount,
    refundTo: payerAccount,
  });

  if (!/^(?:[a-f0-9]{64}|[a-z0-9]+(?:[._-][a-z0-9]+)*)$/.test(
    parsed.data.quote.depositAddress,
  )) {
    throw new Error("NEAR Intents returned an invalid NEAR deposit address.");
  }

  return {
    correlationId: parsed.data.correlationId,
    depositAddress: parsed.data.quote.depositAddress,
    originAssetId: origin.assetId,
    originTokenContract: origin.contractAddress,
    destinationAssetId: destination.assetId,
    destinationTokenContract: destination.contractAddress,
    amountIn: parsed.data.quote.amountIn,
    amountInFormatted: parsed.data.quote.amountInFormatted,
    minAmountIn: parsed.data.quote.minAmountIn ?? null,
    maxAmountIn: parsed.data.quote.maxAmountIn ?? null,
    amountOut,
    amountOutFormatted: parsed.data.quote.amountOutFormatted,
    deadline,
  };
}

export async function submitNearDeposit({
  depositAddress,
  transactionHash,
  payerAccount,
}: {
  depositAddress: string;
  transactionHash: string;
  payerAccount: string;
}) {
  const response = await fetch(`${apiBaseUrl}/deposit/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.NEAR_INTENTS_API_KEY
        ? { "X-API-Key": process.env.NEAR_INTENTS_API_KEY }
        : {}),
    },
    body: JSON.stringify({
      depositAddress,
      txHash: transactionHash,
      nearSenderAccount: payerAccount,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`NEAR Intents deposit notification failed (${response.status}).`);
  }
}

const statusResponseSchema = z.object({
  correlationId: z.string().min(1),
  status: z.enum([
    "PENDING_DEPOSIT",
    "KNOWN_DEPOSIT_TX",
    "PROCESSING",
    "SUCCESS",
    "INCOMPLETE_DEPOSIT",
    "REFUNDED",
    "FAILED",
  ]),
  quoteResponse: quoteResponseSchema,
  swapDetails: z.object({
    amountOut: z.string().optional(),
    destinationChainTxHashes: z.array(z.object({
      hash: z.string().min(1),
      explorerUrl: z.string().url(),
    }).passthrough()).optional(),
    refundedAmount: z.string().optional(),
    refundReason: z.string().optional(),
  }).passthrough(),
}).passthrough();

export type NearIntentStatus = z.infer<typeof statusResponseSchema>;

export async function getNearIntentStatus(depositAddress: string) {
  const url = new URL(`${apiBaseUrl}/status`);
  url.searchParams.set("depositAddress", depositAddress);
  const response = await fetch(url, {
    headers: process.env.NEAR_INTENTS_API_KEY
      ? { "X-API-Key": process.env.NEAR_INTENTS_API_KEY }
      : {},
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`NEAR Intents status lookup failed (${response.status}).`);
  }
  const parsed = statusResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("NEAR Intents returned an invalid payment status.");
  }
  return parsed.data;
}
