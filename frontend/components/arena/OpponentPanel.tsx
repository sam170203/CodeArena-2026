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
}

export function OpponentPanel({
  align,
  username,
  elo,
  steps,
  current,
  lastVerdict,
}: Props) {
  const tier = tierForElo(elo);
  return (
    <div className={cn("flex flex-col gap-2", align === "right" && "items-end text-right")}>
      <div className="flex items-center gap-2.5">
        <div className="font-display text-lg font-bold tracking-[-0.5px] text-[var(--color-text-1)]">
          {username}
        </div>
        <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-text-3)]">
          {tier.key} · ELO {elo}
        </div>
      </div>
      <LadderRail steps={steps} current={current} />
      <div className="font-mono text-[10px] text-[var(--color-text-3)] tracking-[0.1em]">
        Step {Math.min(current + 1, steps.length)} / {steps.length}
      </div>
      {lastVerdict && (
        <VerdictPill verdict={lastVerdict.verdict} testset={lastVerdict.testset} />
      )}
    </div>
  );
}
