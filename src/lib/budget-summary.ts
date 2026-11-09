export type BudgetSummary = {
  verifiedAmountMinor: string;
  reservedAmountMinor: string;
  unreservedVerifiedAmountMinor: string;
};

function isMinorUnits(value: string) {
  return /^(0|[1-9]\d*)$/.test(value);
}

export function summarizeBudget(
  verifiedAmountMinor: string,
  reservedAmountMinor: string,
): BudgetSummary {
  if (
    !isMinorUnits(verifiedAmountMinor) ||
    !isMinorUnits(reservedAmountMinor)
  ) {
    throw new Error("Budget amounts must be non-negative integer minor units.");
  }

  const verified = BigInt(verifiedAmountMinor);
  const reserved = BigInt(reservedAmountMinor);

  return {
    verifiedAmountMinor,
    reservedAmountMinor,
    unreservedVerifiedAmountMinor:
      (verified > reserved ? verified - reserved : BigInt(0)).toString(),
  };
}
