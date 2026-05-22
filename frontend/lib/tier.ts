export type TierKey =
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "MASTER"
  | "LEGEND";

export interface Tier {
  key: TierKey;
  min: number;
  max: number;
  kFactor: number;
}

export const TIERS: Tier[] = [
  { key: "BRONZE", min: 0, max: 999, kFactor: 40 },
  { key: "SILVER", min: 1000, max: 1299, kFactor: 40 },
  { key: "GOLD", min: 1300, max: 1599, kFactor: 32 },
  { key: "PLATINUM", min: 1600, max: 1899, kFactor: 32 },
  { key: "DIAMOND", min: 1900, max: 2199, kFactor: 24 },
  { key: "MASTER", min: 2200, max: 2499, kFactor: 16 },
  { key: "LEGEND", min: 2500, max: 99999, kFactor: 16 },
];

export function tierForElo(elo: number): Tier {
  return TIERS.find((t) => elo >= t.min && elo <= t.max) ?? TIERS[0];
}

export function divisionForElo(elo: number): "I" | "II" | "III" | null {
  const t = tierForElo(elo);
  if (t.key === "LEGEND") return null;
  const span = (t.max - t.min + 1) / 3;
  const offset = elo - t.min;
  if (offset < span) return "III";
  if (offset < span * 2) return "II";
  return "I";
}
