import { describe, expect, it } from "vitest";
import {
  authorizePurchaseRequest,
  type SpendingPolicy,
} from "./spending-policy";

const now = new Date("2026-01-01T00:00:00.000Z");
const policy: SpendingPolicy = {
  perTransactionCapMinor: "5000",
  totalAuthorizedCapMinor: "10000",
  allowedCategories: ["design"],
  allowedProviders: ["studio-1"],
  agentExecutionAllowed: false,
  version: 3,
  expiresAt: new Date("2026-02-01T00:00:00.000Z"),
};
const scope = {
  amountMinor: "2500",
  currency: "USD",
  category: "design",
  providerId: "studio-1",
};

describe("authorizePurchaseRequest", () => {
  it("allows only in-scope requests backed by verified, unreserved funds", () => {
    expect(
      authorizePurchaseRequest(policy, scope, "2500", "5000", now),
    ).toEqual({ allowed: true, requiresHumanApproval: true });
  });

  it("blocks changed provider/category, expired policies, and over-budget scopes", () => {
    expect(
      authorizePurchaseRequest(
        policy,
        { ...scope, providerId: "unlisted" },
        "0",
        "10000",
        now,
      ),
    ).toMatchObject({ allowed: false });
    expect(
      authorizePurchaseRequest(
        policy,
        { ...scope, category: "unlisted" },
        "0",
        "10000",
        now,
      ),
    ).toMatchObject({ allowed: false });
    expect(
      authorizePurchaseRequest(
        { ...policy, expiresAt: now },
        scope,
        "0",
        "10000",
        now,
      ),
    ).toMatchObject({ allowed: false });
    expect(
      authorizePurchaseRequest(
        policy,
        { ...scope, amountMinor: "5001" },
        "0",
        "10000",
        now,
      ),
    ).toMatchObject({ allowed: false });
    expect(
      authorizePurchaseRequest(policy, scope, "8000", "10000", now),
    ).toMatchObject({ allowed: false });
    expect(
      authorizePurchaseRequest(policy, scope, "0", "2499", now),
    ).toMatchObject({ allowed: false });
  });

  it("rejects malformed or non-USD purchase scopes", () => {
    expect(
      authorizePurchaseRequest(
        policy,
        { ...scope, amountMinor: "1.25" },
        "0",
        "10000",
        now,
      ),
    ).toMatchObject({ allowed: false });
    expect(
      authorizePurchaseRequest(
        policy,
        { ...scope, currency: "USDC" },
        "0",
        "10000",
        now,
      ),
    ).toMatchObject({ allowed: false });
  });
});
