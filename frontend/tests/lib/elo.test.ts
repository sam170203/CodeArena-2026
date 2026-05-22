import { describe, it, expect } from "vitest";
import { expectedScore, eloDelta, applyDelta } from "@/lib/elo";

describe("expectedScore", () => {
  it("returns 0.5 for equal elos", () =>
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5));
  it("favors higher elo", () =>
    expect(expectedScore(1700, 1500)).toBeGreaterThan(0.5));
  it("disfavors lower elo", () =>
    expect(expectedScore(1300, 1500)).toBeLessThan(0.5));
});

describe("eloDelta", () => {
  it("equal elos, win gives positive delta", () =>
    expect(eloDelta(1500, 1500, "win")).toBeGreaterThan(0));
  it("equal elos, loss gives negative delta", () =>
    expect(eloDelta(1500, 1500, "loss")).toBeLessThan(0));
  it("equal elos, draw gives zero", () =>
    expect(eloDelta(1500, 1500, "draw")).toBe(0));
  it("bronze K-factor of 40 at equal elos = ±20", () =>
    expect(eloDelta(500, 500, "win")).toBe(20));
  it("master K-factor of 16 at equal elos = ±8", () =>
    expect(eloDelta(2300, 2300, "win")).toBe(8));
  it("upset gives bigger gain", () => {
    expect(eloDelta(1300, 1700, "win")).toBeGreaterThan(
      eloDelta(1500, 1500, "win")
    );
  });
});

describe("applyDelta", () => {
  it("floors at 0", () => expect(applyDelta(10, -20)).toBe(0));
  it("adds normally", () => expect(applyDelta(1500, 24)).toBe(1524));
});
