import { cn } from "@/lib/cn";

export function LiveIndicator({
  count,
  className,
}: {
  count?: number | string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] text-[var(--color-ok-green)]",
        className
      )}
    >
      <span
        className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-ok-green)]"
        style={{ boxShadow: "0 0 12px var(--color-ok-green)" }}
      >
        <span className="absolute inset-0 rounded-full bg-[var(--color-ok-green)] opacity-60 animate-ping" />
      </span>
      <span>LIVE{count != null ? ` · ${count} IN ARENAS` : ""}</span>
    </div>
  );
}
