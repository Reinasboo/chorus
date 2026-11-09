export function usdMinorToUsdcAtomic(amountMinor: string) {
  if (!/^[1-9]\d*$/.test(amountMinor)) {
    throw new Error("USD minor amount must be a positive integer.");
  }
  return (BigInt(amountMinor) * BigInt(10_000)).toString();
}

export const nearIntentTerminalStatuses = new Set([
  "SUCCESS",
  "FAILED",
  "REFUNDED",
  "INCOMPLETE_DEPOSIT",
  "EXPIRED",
  "VERIFICATION_FAILED",
]);

const pendingStatusRank: Record<string, number> = {
  PENDING_DEPOSIT: 0,
  KNOWN_DEPOSIT_TX: 1,
  PROCESSING: 2,
};

export function canTransitionNearIntentStatus(current: string, next: string) {
  if (nearIntentTerminalStatuses.has(current)) return false;
  if (current === next || nearIntentTerminalStatuses.has(next)) return true;
  return (
    pendingStatusRank[current] !== undefined &&
    pendingStatusRank[next] !== undefined &&
    pendingStatusRank[next] >= pendingStatusRank[current]
  );
}

export function assertNearIntentQuoteMatches(
  quote: {
    quoteRequest: {
      amount: string;
      originAsset: string;
      destinationAsset: string;
      recipient: string;
      refundTo: string;
      swapType: string;
    };
    quote: {
      amountIn: string;
      amountOut: string;
      minAmountIn?: string;
      maxAmountIn?: string;
      deadline: string;
    };
  },
  expected: {
    amountOut: string;
    originAssetId: string;
    destinationAssetId: string;
    recipient: string;
    refundTo: string;
  },
) {
  if (
    quote.quoteRequest.swapType !== "EXACT_OUTPUT" ||
    quote.quoteRequest.amount !== expected.amountOut ||
    quote.quoteRequest.originAsset !== expected.originAssetId ||
    quote.quoteRequest.destinationAsset !== expected.destinationAssetId ||
    quote.quoteRequest.recipient !== expected.recipient ||
    quote.quoteRequest.refundTo !== expected.refundTo ||
    quote.quote.amountOut !== expected.amountOut
  ) {
    throw new Error("NEAR Intents returned a quote for a different payment scope.");
  }
  const deadline = new Date(quote.quote.deadline);
  if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now()) {
    throw new Error("NEAR Intents returned an expired quote.");
  }
  if (
    (quote.quote.minAmountIn &&
      BigInt(quote.quote.amountIn) < BigInt(quote.quote.minAmountIn)) ||
    (quote.quote.maxAmountIn &&
      BigInt(quote.quote.amountIn) > BigInt(quote.quote.maxAmountIn))
  ) {
    throw new Error("NEAR Intents returned an inconsistent input amount.");
  }
  return deadline;
}

export type NearIntentSettlementStatus = {
  correlationId: string;
  status: string;
  quoteResponse: {
    correlationId: string;
    quoteRequest: {
      amount: string;
      originAsset: string;
      destinationAsset: string;
      recipient: string;
      refundTo: string;
      swapType: string;
    };
    quote: { amountOut: string };
  };
  swapDetails: {
    amountOut?: string;
    destinationChainTxHashes?: Array<{ hash: string }>;
  };
};

export function statusMatchesPayment(
  status: NearIntentSettlementStatus,
  expected: {
    correlationId: string;
    amountOut: string;
    originAssetId: string;
    destinationAssetId: string;
    recipientAccount: string;
    payerAccount: string;
  },
) {
  const quote = status.quoteResponse;
  const matches =
    status.correlationId === expected.correlationId &&
    quote.correlationId === expected.correlationId &&
    quote.quoteRequest.amount === expected.amountOut &&
    quote.quoteRequest.swapType === "EXACT_OUTPUT" &&
    quote.quoteRequest.originAsset === expected.originAssetId &&
    quote.quoteRequest.destinationAsset === expected.destinationAssetId &&
    quote.quoteRequest.recipient === expected.recipientAccount &&
    quote.quoteRequest.refundTo === expected.payerAccount &&
    quote.quote.amountOut === expected.amountOut;
  const transactionHash =
    status.swapDetails.destinationChainTxHashes?.[0]?.hash ?? null;
  return {
    matches:
      matches &&
      (status.status !== "SUCCESS" ||
        (status.swapDetails.amountOut === expected.amountOut &&
          transactionHash !== null)),
    transactionHash,
  };
}
