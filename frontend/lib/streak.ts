export type FlameTone = "pink" | "gold" | "white-hot";

export function flameTone(count: number): FlameTone {
  if (count >= 30) return "white-hot";
  if (count >= 7) return "gold";
  return "pink";
}

export const FLAME_COLORS: Record<FlameTone, string> = {
  pink: "var(--color-neon-pink)",
  gold: "var(--color-neon-gold)",
  "white-hot": "#ffffff",
};
