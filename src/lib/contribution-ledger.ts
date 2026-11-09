export type ContributionBalanceRow = {
  amountMinor: string;
  currency: string;
  externalReference: string | null;
  receivedAmountMinor: string | null;
  refundedAmountMinor: string;
  source: string;
  status: string;
  verificationEvidence: string | null;
  verifiedAt: Date | null;
  refundEvidence: string | null;
  refundedAt: Date | null;
};

export type ContributionSummary = {
  reportedAmountMinor: string;
  pendingAmountMinor: string;
  verifiedAmountMinor: string;
};

function parseMinorUnits(value: string) {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error("Contribution amounts must be non-negative integer minor units.");
  }
  return BigInt(value);
}

function hasMatchingSettlementEvidence(row: ContributionBalanceRow) {
  if (
    row.source !== "payment_adapter" ||
    !row.verifiedAt ||
    !row.externalReference ||
    !row.verificationEvidence ||
    row.currency !== "USD" ||
    !row.receivedAmountMinor
  ) {
    return false;
  }

  try {
    const evidence: unknown = JSON.parse(row.verificationEvidence);
    if (!evidence || typeof evidence !== "object") return false;
    const record = evidence as Record<string, unknown>;
    return (
      record.verified === true &&
      record.externalReference === row.externalReference &&
      record.amountMinor === row.receivedAmountMinor &&
      record.currency === row.currency &&
      typeof record.network === "string" &&
      record.network.length > 0 &&
      typeof record.recipient === "string" &&
      record.recipient.length > 0
    );
  } catch {
    return false;
  }
}

function hasMatchingRefundEvidence(row: ContributionBalanceRow) {
  if (
    !row.refundedAt ||
    !row.refundEvidence ||
    !row.externalReference ||
    row.currency !== "USD"
  ) {
    return false;
  }

  try {
    const evidence: unknown = JSON.parse(row.refundEvidence);
    if (!evidence || typeof evidence !== "object") return false;
    const record = evidence as Record<string, unknown>;
    return (
      record.verified === true &&
      record.externalReference === row.externalReference &&
      record.amountMinor === row.refundedAmountMinor &&
      record.currency === row.currency &&
      typeof record.network === "string" &&
      record.network.length > 0 &&
      typeof record.recipient === "string" &&
      record.recipient.length > 0
    );
  } catch {
    return false;
  }
}

export function summarizeContributions(
  rows: ContributionBalanceRow[],
): ContributionSummary {
  let reported = BigInt(0);
  let pending = BigInt(0);
  let verified = BigInt(0);

  for (const row of rows) {
    const amount = parseMinorUnits(row.amountMinor);
    if (row.currency !== "USD") {
      throw new Error("Cannot aggregate contributions in different currencies.");
    }

    if (row.status === "reported" && row.source === "user_reported") {
      reported += amount;
      continue;
    }

    if (row.status === "pending") {
      pending += amount;
      continue;
    }

    if (
      (row.status === "confirmed" || row.status === "refunded") &&
      hasMatchingSettlementEvidence(row)
    ) {
      const received = parseMinorUnits(row.receivedAmountMinor!);
      const refunded = parseMinorUnits(row.refundedAmountMinor);
      if (refunded > received) {
        throw new Error("Refunded amount cannot exceed verified received funds.");
      }
      verified += hasMatchingRefundEvidence(row) ? received - refunded : received;
    }
  }

  return {
    reportedAmountMinor: reported.toString(),
    pendingAmountMinor: pending.toString(),
    verifiedAmountMinor: verified.toString(),
  };
}
