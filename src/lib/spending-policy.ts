export type SpendingPolicy = {
  perTransactionCapMinor: string;
  totalAuthorizedCapMinor: string;
  allowedCategories: string[];
  allowedProviders: string[];
  agentExecutionAllowed: boolean;
  version: number;
  expiresAt: Date;
};

export type PurchaseScope = {
  amountMinor: string;
  currency: string;
  category: string;
  providerId: string;
};

export type PurchaseAuthorization =
  | { allowed: true; requiresHumanApproval: true }
  | { allowed: false; reason: string };

function isMinorUnits(value: string) {
  return /^(0|[1-9]\d*)$/.test(value);
}

export function authorizePurchaseRequest(
  policy: SpendingPolicy,
  scope: PurchaseScope,
  reservedMinor: string,
  verifiedMinor: string,
  now: Date,
): PurchaseAuthorization {
  if (
    !isMinorUnits(scope.amountMinor) ||
    BigInt(scope.amountMinor) <= BigInt(0)
  ) {
    return { allowed: false, reason: "Purchase amount is invalid." };
  }
  if (!isMinorUnits(reservedMinor) || !isMinorUnits(verifiedMinor)) {
    return { allowed: false, reason: "Budget amounts are invalid." };
  }
  if (
    !isMinorUnits(policy.perTransactionCapMinor) ||
    BigInt(policy.perTransactionCapMinor) <= BigInt(0) ||
    !isMinorUnits(policy.totalAuthorizedCapMinor) ||
    BigInt(policy.totalAuthorizedCapMinor) <= BigInt(0) ||
    !Number.isInteger(policy.version) ||
    policy.version < 1
  ) {
    return { allowed: false, reason: "The project spending policy is invalid." };
  }
  if (scope.currency !== "USD") {
    return { allowed: false, reason: "Only USD purchases are configured." };
  }
  if (policy.expiresAt.getTime() <= now.getTime()) {
    return { allowed: false, reason: "The project spending policy has expired." };
  }
  if (!policy.allowedCategories.includes(scope.category)) {
    return { allowed: false, reason: "This purchase category is not allowed." };
  }
  if (!policy.allowedProviders.includes(scope.providerId)) {
    return { allowed: false, reason: "This provider is not allowed." };
  }

  const amount = BigInt(scope.amountMinor);
  const reserved = BigInt(reservedMinor);
  if (amount > BigInt(policy.perTransactionCapMinor)) {
    return { allowed: false, reason: "Purchase exceeds the per-transaction cap." };
  }
  if (amount + reserved > BigInt(policy.totalAuthorizedCapMinor)) {
    return { allowed: false, reason: "Purchase exceeds the total authorization cap." };
  }
  if (amount + reserved > BigInt(verifiedMinor)) {
    return { allowed: false, reason: "Verified contributions do not cover this purchase." };
  }

  return { allowed: true, requiresHumanApproval: true };
}
