import { describe, it, expect } from "vitest";
import { toNum, toBool, norm, normCode, parseCsv, splitCsvLine, chunk } from "../utils.js";

describe("toNum", () => {
  it("converts numeric strings", () => {
    expect(toNum("42")).toBe(42);
    expect(toNum("3.14")).toBe(3.14);
  });

  it("converts actual numbers", () => {
    expect(toNum(0)).toBe(0);
    expect(toNum(-5)).toBe(-5);
  });

  it("returns 0 for non-numeric values", () => {
    expect(toNum("abc")).toBe(0);
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum(NaN)).toBe(0);
    expect(toNum(Infinity)).toBe(0);
  });
});

describe("toBool", () => {
  it("passes through booleans", () => {
    expect(toBool(true)).toBe(true);
    expect(toBool(false)).toBe(false);
  });

  it("converts truthy strings", () => {
    expect(toBool("true")).toBe(true);
    expect(toBool("TRUE")).toBe(true);
    expect(toBool("1")).toBe(true);
    expect(toBool("yes")).toBe(true);
  });

  it("converts falsy strings", () => {
    expect(toBool("false")).toBe(false);
    expect(toBool("0")).toBe(false);
    expect(toBool("no")).toBe(false);
    expect(toBool("")).toBe(false);
  });

  it("converts numeric 1 to true", () => {
    expect(toBool(1)).toBe(true);
  });

  it("converts other values to false", () => {
    expect(toBool(0)).toBe(false);
    expect(toBool(null)).toBe(false);
    expect(toBool(2)).toBe(false);
  });
});

describe("norm", () => {
  it("trims whitespace", () => {
    expect(norm("  hello  ")).toBe("hello");
  });

  it("converts null/undefined to empty string", () => {
    expect(norm(null)).toBe("");
    expect(norm(undefined)).toBe("");
  });
});

describe("normCode", () => {
  it("uppercases and trims", () => {
    expect(normCode("abc")).toBe("ABC");
    expect(normCode("  xyz  ")).toBe("XYZ");
  });

  it("handles null/undefined", () => {
    expect(normCode(null)).toBe("");
    expect(normCode(undefined)).toBe("");
  });
});

describe("splitCsvLine", () => {
  it("splits simple CSV", () => {
    expect(splitCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields with commas", () => {
    expect(splitCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  it("trims values", () => {
    expect(splitCsvLine(" a , b , c ")).toEqual(["a", "b", "c"]);
  });
});

describe("parseCsv", () => {
  it("parses simple CSV text", () => {
    const csv = "name,age\nAlice,30\nBob,25";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "Alice", age: "30" });
    expect(rows[1]).toEqual({ name: "Bob", age: "25" });
  });

  it("returns empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("  \n  \n  ")).toEqual([]);
  });

  it("handles missing trailing values", () => {
    const csv = "a,b,c\n1,2";
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });
});

describe("chunk", () => {
  it("splits array into chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("handles exact divisions", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("handles empty array", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("handles chunk size larger than array", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
});
