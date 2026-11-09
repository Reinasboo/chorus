import { describe, expect, it } from "vitest";
import { summarizeBudget } from "./budget-summary";

describe("summarizeBudget", () => {
  it("subtracts active authorization reservations using integer minor units", () => {
    expect(summarizeBudget("10001", "2500")).toEqual({
      verifiedAmountMinor: "10001",
      reservedAmountMinor: "2500",
      unreservedVerifiedAmountMinor: "7501",
    });
  });

  it("never reports negative unreserved funds", () => {
    expect(summarizeBudget("100", "500").unreservedVerifiedAmountMinor).toBe("0");
  });

  it("rejects decimals, negative values, and malformed amounts", () => {
    expect(() => summarizeBudget("1.00", "0")).toThrow();
    expect(() => summarizeBudget("100", "-1")).toThrow();
    expect(() => summarizeBudget("100", "01")).toThrow();
  });
});
