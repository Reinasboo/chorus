const DECIMAL_AMOUNT = /^(0|[1-9]\d{0,8})(?:\.(\d{1,2}))?$/;

export function parseUsdToMinorUnits(value: string): string | null {
  const match = DECIMAL_AMOUNT.exec(value.trim());
  if (!match) return null;

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0"));
  const minorUnits = whole * BigInt(100) + fraction;

  if (minorUnits <= BigInt(0) || minorUnits > BigInt(99_999_999_999)) {
    return null;
  }
  return minorUnits.toString();
}

export function formatUsdFromMinorUnits(value: string): string {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error("Amount must be a non-negative integer in minor units.");
  }

  const minorUnits = BigInt(value);
  const dollars = minorUnits / BigInt(100);
  const cents = (minorUnits % BigInt(100)).toString().padStart(2, "0");
  return `$${dollars.toLocaleString("en-US")}.${cents}`;
}

export function usdInputFromMinorUnits(value: string): string {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error("Amount must be a non-negative integer in minor units.");
  }

  const minorUnits = BigInt(value);
  return `${minorUnits / BigInt(100)}.${(minorUnits % BigInt(100))
    .toString()
    .padStart(2, "0")}`;
}
