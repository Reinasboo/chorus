import { describe, expect, it } from "vitest";
import {
  assertNearIntentQuoteMatches,
  canTransitionNearIntentStatus,
  nearIntentTerminalStatuses,
  statusMatchesPayment,
  usdMinorToUsdcAtomic,
  type NearIntentSettlementStatus,
} from "./near-intents-contract";

const expected = {
  correlationId: "quote-123",
  amountOut: "1000000",
  originAssetId: "nep141:wrap.near",
  destinationAssetId: "nep141:usdc.near",
  recipientAccount: "project.near",
  payerAccount: "member.near",
};

function quoteResponse() {
  return {
    quoteRequest: {
      amount: expected.amountOut,
      originAsset: expected.originAssetId,
      destinationAsset: expected.destinationAssetId,
      recipient: expected.recipientAccount,
      refundTo: expected.payerAccount,
      swapType: "EXACT_OUTPUT",
    },
    quote: {
      amountIn: "2000000000000000000000000",
      amountOut: expected.amountOut,
      minAmountIn: "1900000000000000000000000",
      maxAmountIn: "2100000000000000000000000",
      deadline: new Date(Date.now() + 60_000).toISOString(),
    },
  };
}

function successStatus(): NearIntentSettlementStatus {
  return {
    correlationId: expected.correlationId,
    status: "SUCCESS",
    quoteResponse: {
      correlationId: expected.correlationId,
      quoteRequest: {
        amount: expected.amountOut,
        originAsset: expected.originAssetId,
        destinationAsset: expected.destinationAssetId,
        recipient: expected.recipientAccount,
        refundTo: expected.payerAccount,
        swapType: "EXACT_OUTPUT",
      },
      quote: { amountOut: expected.amountOut },
    },
    swapDetails: {
      amountOut: expected.amountOut,
      destinationChainTxHashes: [{ hash: "destination-tx" }],
    },
  };
}

describe("NEAR Intents payment scope", () => {
  it("accepts a live quote only when scope and input bounds match", () => {
    expect(
      assertNearIntentQuoteMatches(quoteResponse(), {
        amountOut: expected.amountOut,
        originAssetId: expected.originAssetId,
        destinationAssetId: expected.destinationAssetId,
        recipient: expected.recipientAccount,
        refundTo: expected.payerAccount,
      }).getTime(),
    ).toBeGreaterThan(Date.now());
  });

  it("rejects a quote with a different recipient or output", () => {
    const wrongRecipient = quoteResponse();
    wrongRecipient.quoteRequest.recipient = "attacker.near";
    expect(() =>
      assertNearIntentQuoteMatches(wrongRecipient, {
        amountOut: expected.amountOut,
        originAssetId: expected.originAssetId,
        destinationAssetId: expected.destinationAssetId,
        recipient: expected.recipientAccount,
        refundTo: expected.payerAccount,
      }),
    ).toThrow(/different payment scope/);

    const wrongOutput = quoteResponse();
    wrongOutput.quote.amountOut = "999999";
    expect(() =>
      assertNearIntentQuoteMatches(wrongOutput, {
        amountOut: expected.amountOut,
        originAssetId: expected.originAssetId,
        destinationAssetId: expected.destinationAssetId,
        recipient: expected.recipientAccount,
        refundTo: expected.payerAccount,
      }),
    ).toThrow(/different payment scope/);
  });

  it("rejects expired quotes and inconsistent input bounds", () => {
    const expired = quoteResponse();
    expired.quote.deadline = new Date(Date.now() - 1).toISOString();
    expect(() =>
      assertNearIntentQuoteMatches(expired, {
        amountOut: expected.amountOut,
        originAssetId: expected.originAssetId,
        destinationAssetId: expected.destinationAssetId,
        recipient: expected.recipientAccount,
        refundTo: expected.payerAccount,
      }),
    ).toThrow(/expired quote/);

    const outsideBounds = quoteResponse();
    outsideBounds.quote.maxAmountIn = "1";
    expect(() =>
      assertNearIntentQuoteMatches(outsideBounds, {
        amountOut: expected.amountOut,
        originAssetId: expected.originAssetId,
        destinationAssetId: expected.destinationAssetId,
        recipient: expected.recipientAccount,
        refundTo: expected.payerAccount,
      }),
    ).toThrow(/inconsistent input amount/);
  });

  it("keeps payment status transitions monotonic and terminal-safe", () => {
    expect(canTransitionNearIntentStatus("PROCESSING", "PENDING_DEPOSIT")).toBe(
      false,
    );
    expect(canTransitionNearIntentStatus("PROCESSING", "PROCESSING")).toBe(true);
    expect(canTransitionNearIntentStatus("KNOWN_DEPOSIT_TX", "PROCESSING")).toBe(
      true,
    );
    for (const status of nearIntentTerminalStatuses) {
      expect(canTransitionNearIntentStatus(status, "PROCESSING")).toBe(false);
    }
  });

  it("converts USD cents to exact six-decimal USDC units", () => {
    expect(usdMinorToUsdcAtomic("1")).toBe("10000");
    expect(usdMinorToUsdcAtomic("12345")).toBe("123450000");
  });

  it("rejects malformed or non-positive USD minor amounts", () => {
    expect(() => usdMinorToUsdcAtomic("0")).toThrow();
    expect(() => usdMinorToUsdcAtomic("-1")).toThrow();
    expect(() => usdMinorToUsdcAtomic("1.2")).toThrow();
  });

  it("accepts a successful status only when its exact quote and destination match", () => {
    expect(statusMatchesPayment(successStatus(), expected)).toEqual({
      matches: true,
      transactionHash: "destination-tx",
    });
  });

  it("rejects a status for a different recipient", () => {
    const status = successStatus();
    status.quoteResponse.quoteRequest.recipient = "attacker.near";
    expect(statusMatchesPayment(status, expected).matches).toBe(false);
  });

  it("rejects a successful status with a mismatched output or no destination transaction", () => {
    const wrongAmount = successStatus();
    wrongAmount.swapDetails.amountOut = "999999";
    expect(statusMatchesPayment(wrongAmount, expected).matches).toBe(false);

    const noTransaction = successStatus();
    noTransaction.swapDetails.destinationChainTxHashes = [];
    expect(statusMatchesPayment(noTransaction, expected).matches).toBe(false);
  });
});
