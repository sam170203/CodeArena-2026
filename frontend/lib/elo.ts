import { tierForElo } from "./tier";

export type DuelResult = "win" | "loss" | "draw";

export function expectedScore(myElo: number, oppElo: number): number {
  return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
}

export function eloDelta(
  myElo: number,
  oppElo: number,
  result: DuelResult
): number {
  const k = tierForElo(myElo).kFactor;
  const actual = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  return Math.round(k * (actual - expectedScore(myElo, oppElo)));
}

export function applyDelta(currentElo: number, delta: number): number {
  return Math.max(0, currentElo + delta);
}
