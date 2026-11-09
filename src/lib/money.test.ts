import { describe, expect, it } from "vitest";
import { formatUsdFromMinorUnits, parseUsdToMinorUnits } from "./money";

describe("USD base-unit conversion", () => {
  it.each([
    ["1", "100"],
    ["1.2", "120"],
    ["1.02", "102"],
    ["999999999.99", "99999999999"],
  ])("converts %s to integer cents", (input, expected) => {
    expect(parseUsdToMinorUnits(input)).toBe(expected);
  });

  it.each(["0", "0.00", "-1", "1.001", "1e2", "  ", "1000000000"])(
    "rejects invalid or out-of-range amount %s",
    (input) => {
      expect(parseUsdToMinorUnits(input)).toBeNull();
    },
  );

  it("formats cents without floating-point arithmetic", () => {
    expect(formatUsdFromMinorUnits("100000001")).toBe("$1,000,000.01");
  });

  it("rejects malformed stored amounts", () => {
    expect(() => formatUsdFromMinorUnits("-1")).toThrow(
      "Amount must be a non-negative integer in minor units.",
    );
  });
});
