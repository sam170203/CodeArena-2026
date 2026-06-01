import { describe, it, expect } from "vitest";
import { tierForElo, divisionForElo } from "@/lib/tier";

describe("tierForElo", () => {
  it("returns BRONZE for low elo", () =>
    expect(tierForElo(0).key).toBe("BRONZE"));
  it("returns SILVER at boundary", () =>
    expect(tierForElo(1000).key).toBe("SILVER"));
  it("returns GOLD at 1300", () => expect(tierForElo(1300).key).toBe("GOLD"));
  it("returns PLATINUM at 1700", () =>
    expect(tierForElo(1700).key).toBe("PLATINUM"));
  it("returns DIAMOND at 1900", () =>
    expect(tierForElo(1900).key).toBe("DIAMOND"));
  it("returns MASTER at 2200", () =>
    expect(tierForElo(2200).key).toBe("MASTER"));
  it("returns LEGEND at 2500", () =>
    expect(tierForElo(2500).key).toBe("LEGEND"));
  it("k-factor decreases with tier", () => {
    expect(tierForElo(500).kFactor).toBe(40);
    expect(tierForElo(1500).kFactor).toBe(32);
    expect(tierForElo(2000).kFactor).toBe(24);
    expect(tierForElo(2300).kFactor).toBe(16);
  });
});

describe("divisionForElo", () => {
  it("returns III at tier bottom", () =>
    expect(divisionForElo(1000)).toBe("III"));
  it("returns I at tier top", () => expect(divisionForElo(1299)).toBe("I"));
  it("LEGEND has no division", () => expect(divisionForElo(2600)).toBe(null));
});
