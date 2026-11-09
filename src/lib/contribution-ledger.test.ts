import { describe, expect, it } from "vitest";
import {
  summarizeContributions,
  type ContributionBalanceRow,
} from "./contribution-ledger";

function row(
  overrides: Partial<ContributionBalanceRow>,
): ContributionBalanceRow {
  return {
    amountMinor: "2500",
    currency: "USD",
    externalReference: null,
    receivedAmountMinor: null,
    refundedAmountMinor: "0",
    source: "user_reported",
    status: "reported",
    verificationEvidence: null,
    verifiedAt: null,
    refundEvidence: null,
    refundedAt: null,
    ...overrides,
  };
}

describe("summarizeContributions", () => {
  it("keeps reports and pending payments separate from verified funds", () => {
    expect(
      summarizeContributions([
        row({ amountMinor: "2500" }),
        row({ amountMinor: "5000", status: "pending", source: "payment_adapter" }),
        row({
          amountMinor: "4000",
          currency: "USD",
          externalReference: "payment-1",
          receivedAmountMinor: "4000",
          refundedAmountMinor: "1000",
          refundEvidence: JSON.stringify({
            verified: true,
            externalReference: "payment-1",
            amountMinor: "1000",
            currency: "USD",
            network: "near-mainnet",
            recipient: "recipient.near",
          }),
          refundedAt: new Date(),
          source: "payment_adapter",
          status: "confirmed",
          verificationEvidence: JSON.stringify({
            verified: true,
            externalReference: "payment-1",
            amountMinor: "4000",
            currency: "USD",
            network: "near-mainnet",
            recipient: "recipient.near",
          }),
          verifiedAt: new Date(),
        }),
        row({
          amountMinor: "8000",
          source: "payment_adapter",
          status: "confirmed",
        }),
      ]),
    ).toEqual({
      reportedAmountMinor: "2500",
      pendingAmountMinor: "5000",
      verifiedAmountMinor: "3000",
    });
  });

  it("does not count a provider-reported success without independent evidence", () => {
    expect(
      summarizeContributions([
        row({
          externalReference: "1click-quote",
          source: "payment_adapter",
          status: "pending",
        }),
      ]),
    ).toEqual({
      reportedAmountMinor: "0",
      pendingAmountMinor: "2500",
      verifiedAmountMinor: "0",
    });
  });

  it("ignores evidence that does not match the recorded payment", () => {
    const contribution = row({
      externalReference: "payment-1",
      receivedAmountMinor: "2500",
      source: "payment_adapter",
      status: "confirmed",
      verificationEvidence: JSON.stringify({
        verified: true,
        externalReference: "different-payment",
        amountMinor: "2500",
        currency: "USD",
        network: "near-mainnet",
        recipient: "recipient.near",
      }),
      verifiedAt: new Date(),
    });

    expect(summarizeContributions([contribution]).verifiedAmountMinor).toBe("0");
  });

  it("rejects cross-currency aggregation and refunds above received funds", () => {
    expect(() =>
      summarizeContributions([row({ currency: "EUR" })]),
    ).toThrow("Cannot aggregate contributions in different currencies.");

    const contribution = row({
      externalReference: "payment-1",
      receivedAmountMinor: "2500",
      refundedAmountMinor: "2501",
      refundEvidence: JSON.stringify({
        verified: true,
        externalReference: "payment-1",
        amountMinor: "2501",
        currency: "USD",
        network: "near-mainnet",
        recipient: "recipient.near",
      }),
      refundedAt: new Date(),
      source: "payment_adapter",
      status: "confirmed",
      verificationEvidence: JSON.stringify({
        verified: true,
        externalReference: "payment-1",
        amountMinor: "2500",
        currency: "USD",
        network: "near-mainnet",
        recipient: "recipient.near",
      }),
      verifiedAt: new Date(),
    });
    expect(() => summarizeContributions([contribution])).toThrow(
      "Refunded amount cannot exceed verified received funds.",
    );
  });
});
