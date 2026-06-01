"use client";
import { useAuth } from "@/stores/auth";
import { FLAME_COLORS, flameTone } from "@/lib/streak";

export function StreakBadge() {
  const streak = useAuth((s) => s.user?.streak);
  const count = streak?.current_count ?? 0;
  const tone = flameTone(count);
  const color = FLAME_COLORS[tone];

  return (
    <div
      className="flex items-center justify-between rounded-lg border px-3.5 py-3"
      style={{
        borderColor: tone === "gold" ? "rgba(251,191,36,0.25)" : "var(--color-border)",
        background:
          tone === "gold"
            ? "linear-gradient(90deg, rgba(251,191,36,0.1), transparent)"
            : tone === "white-hot"
            ? "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)"
            : "linear-gradient(90deg, rgba(236,72,153,0.06), transparent)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="font-display text-xl font-black"
          style={{ color, textShadow: `0 0 12px ${color}` }}
        >
          ⟁
        </span>
        <div>
          <div className="font-semibold text-[13px] text-[var(--color-text-1)]">
            {count > 0 ? `${count}-day streak` : "Start your streak"}
          </div>
          <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-3)]">
            {count > 0 ? "duel today to keep flame" : "win a duel to begin"}
          </div>
        </div>
      </div>
      <div
        className="font-mono text-lg font-bold"
        style={{ color }}
      >
        {count}
      </div>
    </div>
  );
}
