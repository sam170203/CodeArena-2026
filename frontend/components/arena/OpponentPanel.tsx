import { cn } from "@/lib/cn";
import { LadderRail } from "./LadderRail";
import { VerdictPill, Verdict } from "@/components/primitives/VerdictPill";
import { tierForElo } from "@/lib/tier";

interface Props {
  align: "left" | "right";
  username: string;
  elo: number;
  steps: { step_index: number; status: "pending" | "solved" | "skipped" }[];
  current: number;
  lastVerdict?: { verdict: Verdict; testset?: number } | null;
  currentProblem?: { name: string; rating: number } | null;
  isYou?: boolean;
}

export function OpponentPanel({
  align,
  username,
  elo,
  steps,
  current,
  lastVerdict,
  currentProblem,
  isYou,
}: Props) {
  const tier = tierForElo(elo);
  const solvedCount = steps.filter((s) => s.status === "solved").length;
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border p-4 transition",
        isYou
          ? "border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/[0.04]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]/40",
        align === "right" && "items-end text-right"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5",
          align === "right" && "flex-row-reverse"
        )}
      >
        <div className="font-display text-lg font-bold tracking-[-0.5px] text-[var(--color-text-1)]">
          {username}
        </div>
        {isYou && (
          <span className="rounded border border-[var(--color-neon-pink)]/40 bg-[var(--color-neon-pink)]/10 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-[var(--color-neon-pink)] uppercase">
            you
          </span>
        )}
      </div>
      <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-text-3)] uppercase">
        {tier.key} · ELO {elo}
      </div>

      <LadderRail steps={steps} current={current} />

      <div
        className={cn(
          "flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-3)]",
          align === "right" && "flex-row-reverse"
        )}
      >
        <span>
          Step {Math.min(current + 1, steps.length)} / {steps.length}
        </span>
        <span className="opacity-50">·</span>
        <span className="text-[var(--color-ok-green)]">{solvedCount} solved</span>
      </div>

      {currentProblem && (
        <div
          className={cn(
            "mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px]",
            isYou ? "text-[var(--color-neon-cyan)]" : "text-[var(--color-text-2)]"
          )}
          title={currentProblem.name}
        >
          <span className="opacity-60">on </span>
          {currentProblem.name}
          <span className="opacity-60"> · {currentProblem.rating}</span>
        </div>
      )}

      {lastVerdict && (
        <div className="mt-1">
          <VerdictPill verdict={lastVerdict.verdict} testset={lastVerdict.testset} />
        </div>
      )}
    </div>
  );
}
