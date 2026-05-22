"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";

interface DuelRow {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  delta: number;
  steps_cleared: number;
  duration_seconds: number;
  ended_at: string;
}

function formatDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function RecentDuelsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-duels"],
    queryFn: async () => (await api.get<DuelRow[]>("/duel/recent/me")).data,
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
          Recent duels
        </div>
        <span className="font-mono text-[11px] text-[var(--color-neon-cyan)] uppercase tracking-[0.2em]">
          View all →
        </span>
      </div>
      {isLoading && (
        <div className="font-mono text-xs text-[var(--color-text-3)]">loading…</div>
      )}
      {!isLoading && (!data || data.length === 0) && (
        <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
          No duels yet. Enter the arena to begin your legacy.
        </div>
      )}
      {data &&
        data.map((d) => (
          <div
            key={d.id + d.ended_at}
            className="grid grid-cols-[60px_1fr_70px_70px] items-center gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0"
          >
            <div
              className={`font-display text-xs font-extrabold tracking-[0.15em] ${
                d.result === "win"
                  ? "text-[var(--color-ok-green)]"
                  : d.result === "loss"
                  ? "text-[var(--color-fail-red)]"
                  : "text-[var(--color-text-3)]"
              }`}
            >
              {d.result.toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--color-text-1)]">
                vs {d.opponent}
              </div>
              <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-3)]">
                {d.steps_cleared}/5 STEPS · {formatDur(d.duration_seconds)}
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-[var(--color-text-3)]">
              {timeAgo(d.ended_at)}
            </div>
            <div
              className={`text-right font-mono text-[13px] font-bold ${
                d.delta > 0
                  ? "text-[var(--color-ok-green)]"
                  : d.delta < 0
                  ? "text-[var(--color-fail-red)]"
                  : "text-[var(--color-text-3)]"
              }`}
            >
              {d.delta > 0 ? "+" : ""}
              {d.delta}
            </div>
          </div>
        ))}
    </Card>
  );
}
