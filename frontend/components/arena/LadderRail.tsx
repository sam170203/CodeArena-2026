import { cn } from "@/lib/cn";

interface Step {
  step_index: number;
  status: "pending" | "solved" | "skipped";
}

export function LadderRail({
  steps,
  current,
}: {
  steps: Step[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s) => (
        <div
          key={s.step_index}
          className={cn(
            "h-2 w-12 rounded-full transition",
            s.status === "solved"
              ? "bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-violet)]"
              : s.step_index === current
              ? "bg-[var(--color-neon-cyan)]/40 ring-1 ring-[var(--color-neon-cyan)]"
              : "bg-[var(--color-surface-2)]"
          )}
        />
      ))}
    </div>
  );
}
