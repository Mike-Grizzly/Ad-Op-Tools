import { describe, expect, it } from "vitest";
import { spendToMicros } from "./transforms";

describe("spendToMicros", () => {
  it("returns 0 for undefined or empty input", () => {
    expect(spendToMicros(undefined)).toBe(0);
    expect(spendToMicros("")).toBe(0);
  });

  it("converts whole units to micros", () => {
    expect(spendToMicros("1")).toBe(1_000_000);
    expect(spendToMicros("100")).toBe(100_000_000);
  });

  it("converts fractional values without float drift", () => {
    expect(spendToMicros("12.34")).toBe(12_340_000);
    expect(spendToMicros("0.01")).toBe(10_000);
    expect(spendToMicros("0.000001")).toBe(1);
  });

  it("preserves up to six decimal places and truncates beyond", () => {
    expect(spendToMicros("1.123456")).toBe(1_123_456);
    expect(spendToMicros("1.1234567")).toBe(1_123_456);
  });

  it("handles negative values (credits)", () => {
    expect(spendToMicros("-1.50")).toBe(-1_500_000);
    expect(spendToMicros("-0.000001")).toBe(-1);
  });

  it("trims surrounding whitespace", () => {
    expect(spendToMicros("  2.5  ")).toBe(2_500_000);
  });

  it("does not lose precision on large spends", () => {
    expect(spendToMicros("999999.999999")).toBe(999_999_999_999);
  });
});
