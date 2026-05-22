import { cn } from "@/lib/cn";

export type Verdict =
  | "AC"
  | "WA"
  | "TLE"
  | "MLE"
  | "RE"
  | "CE"
  | "RUNNING"
  | "PENDING";

const cls: Record<Verdict, string> = {
  AC: "text-[var(--color-ok-green)] border-[var(--color-ok-green)]/40 bg-[var(--color-ok-green)]/10",
  WA: "text-[var(--color-fail-red)] border-[var(--color-fail-red)]/40 bg-[var(--color-fail-red)]/10",
  TLE: "text-[var(--color-neon-gold)] border-[var(--color-neon-gold)]/40 bg-[var(--color-neon-gold)]/10",
  MLE: "text-[var(--color-neon-gold)] border-[var(--color-neon-gold)]/40 bg-[var(--color-neon-gold)]/10",
  RE: "text-[var(--color-fail-red)] border-[var(--color-fail-red)]/40 bg-[var(--color-fail-red)]/10",
  CE: "text-[var(--color-fail-red)] border-[var(--color-fail-red)]/40 bg-[var(--color-fail-red)]/10",
  RUNNING:
    "text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)]/40 bg-[var(--color-neon-cyan)]/10",
  PENDING:
    "text-[var(--color-text-2)] border-[var(--color-border)] bg-[var(--color-surface-2)]/40",
};

export function VerdictPill({
  verdict,
  testset,
  className,
}: {
  verdict: Verdict;
  testset?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono font-bold text-[11px] tracking-[0.1em] px-2.5 py-1 rounded border",
        cls[verdict],
        className
      )}
    >
      {verdict}
      {testset != null && verdict !== "AC" && (
        <span className="opacity-70">· t{testset}</span>
      )}
    </span>
  );
}
