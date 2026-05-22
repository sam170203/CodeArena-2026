import { cn } from "@/lib/cn";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  className?: string;
}

export function StatTile({
  label,
  value,
  delta,
  deltaTone = "neutral",
  className,
}: Props) {
  const deltaColor =
    deltaTone === "up"
      ? "text-[var(--color-ok-green)]"
      : deltaTone === "down"
      ? "text-[var(--color-fail-red)]"
      : "text-[var(--color-text-3)]";
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-neon-violet)]/[0.06] p-4",
        className
      )}
    >
      <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">
        {label}
      </div>
      <div className="font-mono font-bold text-[28px] leading-none text-[var(--color-text-1)] mt-1">
        {value}
      </div>
      {delta && (
        <div className={cn("font-mono text-[11px] mt-1", deltaColor)}>{delta}</div>
      )}
    </div>
  );
}
