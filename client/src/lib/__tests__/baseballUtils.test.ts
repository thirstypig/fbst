import { describe, it, expect } from "vitest";
import {
  POS_ORDER,
  POS_SCORE,
  getPrimaryPosition,
  sortByPosition,
} from "../baseballUtils";

describe("POS_ORDER", () => {
  it("has 10 positions in canonical order", () => {
    expect(POS_ORDER).toEqual([
      "C", "1B", "2B", "3B", "SS", "OF", "SP", "RP", "P", "DH",
    ]);
  });
});

describe("POS_SCORE", () => {
  it("assigns increasing scores in order", () => {
    expect(POS_SCORE["C"]).toBe(0);
    expect(POS_SCORE["1B"]).toBe(1);
    expect(POS_SCORE["DH"]).toBe(9);
  });

  it("C sorts before SS", () => {
    expect(POS_SCORE["C"]).toBeLessThan(POS_SCORE["SS"]);
  });

  it("SP sorts before RP", () => {
    expect(POS_SCORE["SP"]).toBeLessThan(POS_SCORE["RP"]);
  });
});

describe("getPrimaryPosition", () => {
  it("returns first position from comma-separated list", () => {
    expect(getPrimaryPosition("SS,2B")).toBe("SS");
    expect(getPrimaryPosition("OF,1B,DH")).toBe("OF");
  });

  it("returns single position as-is", () => {
    expect(getPrimaryPosition("C")).toBe("C");
    expect(getPrimaryPosition("SP")).toBe("SP");
  });

  it("defaults to DH for undefined/empty", () => {
    expect(getPrimaryPosition(undefined)).toBe("DH");
    expect(getPrimaryPosition("")).toBe("DH");
  });

  it("normalizes CM to 1B/3B", () => {
    expect(getPrimaryPosition("CM")).toBe("1B/3B");
  });

  it("normalizes MI to 2B/SS", () => {
    expect(getPrimaryPosition("MI")).toBe("2B/SS");
  });

  it("trims whitespace", () => {
    expect(getPrimaryPosition(" SP , RP ")).toBe("SP");
  });
});

describe("sortByPosition", () => {
  it("sorts C before SS", () => {
    const a = { positions: "C" };
    const b = { positions: "SS" };
    expect(sortByPosition(a, b)).toBeLessThan(0);
  });

  it("sorts SP before DH", () => {
    const a = { positions: "SP" };
    const b = { positions: "DH" };
    expect(sortByPosition(a, b)).toBeLessThan(0);
  });

  it("returns 0 for same position", () => {
    const a = { positions: "OF" };
    const b = { positions: "OF" };
    expect(sortByPosition(a, b)).toBe(0);
  });

  it("handles split positions (1B/3B sorts by first part)", () => {
    const cm = { positions: "CM" }; // maps to 1B/3B -> sorts by 1B
    const ss = { positions: "SS" };
    expect(sortByPosition(cm, ss)).toBeLessThan(0); // 1B < SS
  });

  it("handles undefined positions (default to DH)", () => {
    const a = { positions: undefined } as { positions?: string };
    const b = { positions: "C" };
    expect(sortByPosition(a, b)).toBeGreaterThan(0); // DH > C
  });

  it("sorts a full roster correctly", () => {
    const roster = [
      { positions: "DH" },
      { positions: "SP" },
      { positions: "C" },
      { positions: "OF" },
      { positions: "SS" },
    ];
    const sorted = [...roster].sort(sortByPosition);
    expect(sorted.map((p) => p.positions)).toEqual([
      "C", "SS", "OF", "SP", "DH",
    ]);
  });

  it("handles unknown positions (sorted to end)", () => {
    const a = { positions: "UTIL" }; // unknown -> score 99
    const b = { positions: "C" }; // score 0
    expect(sortByPosition(a, b)).toBeGreaterThan(0);
  });
});
