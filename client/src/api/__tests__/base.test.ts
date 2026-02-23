import { describe, it, expect } from "vitest";
import { toNum, fmt2, fmt3Avg, fmtRate, yyyyMmDd, addDays } from "../base";

describe("toNum", () => {
  it("converts numeric strings", () => {
    expect(toNum("42")).toBe(42);
    expect(toNum("3.14")).toBe(3.14);
  });

  it("returns 0 for non-numeric values", () => {
    expect(toNum("abc")).toBe(0);
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum(NaN)).toBe(0);
    expect(toNum(Infinity)).toBe(0);
  });

  it("converts zero correctly", () => {
    expect(toNum(0)).toBe(0);
    expect(toNum("0")).toBe(0);
  });
});

describe("fmt2", () => {
  it("formats to 2 decimal places", () => {
    expect(fmt2(3.14159)).toBe("3.14");
    expect(fmt2(100)).toBe("100.00");
  });

  it("returns empty string for non-finite", () => {
    expect(fmt2(NaN)).toBe("");
    expect(fmt2(Infinity)).toBe("");
  });
});

describe("fmt3Avg", () => {
  it("formats batting average", () => {
    expect(fmt3Avg(30, 100)).toBe(".300");
    expect(fmt3Avg(25, 100)).toBe(".250");
  });

  it("handles 1.000 average", () => {
    expect(fmt3Avg(100, 100)).toBe("1.000");
  });

  it("returns .000 for zero at-bats", () => {
    expect(fmt3Avg(0, 0)).toBe(".000");
  });
});

describe("fmtRate", () => {
  it("formats rate stats with leading dot", () => {
    expect(fmtRate(0.285)).toBe(".285");
  });

  it("handles 1.0+ values", () => {
    expect(fmtRate(1.234)).toBe("1.234");
  });

  it("returns .000 for non-finite", () => {
    expect(fmtRate(NaN)).toBe(".000");
  });
});

describe("yyyyMmDd", () => {
  it("formats date correctly", () => {
    const d = new Date(2024, 5, 15); // June 15, 2024
    expect(yyyyMmDd(d)).toBe("2024-06-15");
  });

  it("pads single-digit months and days", () => {
    const d = new Date(2024, 0, 5); // Jan 5, 2024
    expect(yyyyMmDd(d)).toBe("2024-01-05");
  });
});

describe("addDays", () => {
  it("adds days correctly", () => {
    const d = new Date(2024, 0, 1); // Jan 1, 2024
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(6);
  });

  it("handles negative days", () => {
    const d = new Date(2024, 0, 10); // Jan 10
    const result = addDays(d, -5);
    expect(result.getDate()).toBe(5);
  });

  it("does not mutate original date", () => {
    const d = new Date(2024, 0, 1);
    const original = d.getTime();
    addDays(d, 10);
    expect(d.getTime()).toBe(original);
  });

  it("handles month boundaries", () => {
    const d = new Date(2024, 0, 30); // Jan 30
    const result = addDays(d, 5); // Should be Feb 4
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(4);
  });
});
